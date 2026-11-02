"""Unit tests for the GASTECT bridge.

Run with:  python -m pytest bridge/test_bridge.py
"""
import asyncio
import json
import os
import sys

import pytest
import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bridge  # noqa: E402


class FakeWebSocket:
    """Minimal stand-in for a websockets connection."""

    def __init__(self):
        self.sent = []

    async def send(self, payload):
        self.sent.append(payload)


@pytest.fixture(autouse=True)
def _restore_thresholds():
    original = {
        sensor: dict(levels) for sensor, levels in bridge.thresholds.items()
    }
    yield
    bridge.thresholds = original


def _write_config(tmp_path, alerts):
    path = tmp_path / "config.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "serial": {"port": "COM9", "baud_rate": 9600},
                "websocket": {"port": 9999},
                "alerts": alerts,
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    return str(path)


def test_load_config_parses_thresholds(tmp_path):
    config_path = _write_config(
        tmp_path,
        {"gas": {"safe": 100, "warning": 300},
         "flame": {"safe": 150, "warning": 350}},
    )
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(bridge, "CONFIG_PATH", config_path)
    cfg = bridge.load_config()
    monkeypatch.undo()
    assert cfg["port"] == "COM9"
    assert cfg["baud_rate"] == 9600
    assert cfg["ws_port"] == 9999
    assert cfg["thresholds"]["gas"] == {"safe": 100, "warning": 300}
    assert cfg["thresholds"]["flame"] == {"safe": 150, "warning": 350}


@pytest.mark.parametrize(
    "readings,expected",
    [
        ({"ppm": 50, "flame": 10}, "SAFE"),
        ({"ppm": 200, "flame": 0}, "WARNING"),
        ({"ppm": 499, "flame": 0}, "WARNING"),
        ({"ppm": 500, "flame": 0}, "DANGER"),
        ({"ppm": 100, "flame": 200}, "WARNING"),
        ({"ppm": 100, "flame": 400}, "DANGER"),
    ],
)
def test_classify_status_boundaries(readings, expected):
    assert bridge.classify_status(readings) == expected


def test_wire_command_servo_clamps():
    assert bridge._wire_command("servo", {"angle": 0}) == "servo:0"
    assert bridge._wire_command("servo", {"angle": 450}) == "servo:180"
    assert bridge._wire_command("servo", {"value": -5}) == "servo:0"


def test_wire_command_set_threshold():
    line = bridge._wire_command(
        "set_threshold",
        {"sensor": "gas", "level": "warning", "value": 600},
    )
    assert line == "set_threshold:gas:warning:600"


def test_apply_threshold_validation(tmp_path):
    config_path = _write_config(
        tmp_path,
        {"gas": {"safe": 200, "warning": 500},
         "flame": {"safe": 200, "warning": 400}},
    )
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(bridge, "CONFIG_PATH", config_path)

    ok, err = bridge.apply_threshold({"sensor": "smoke", "level": "safe", "value": 10})
    assert not ok
    assert "sensor" in err

    ok, err = bridge.apply_threshold({"sensor": "gas", "level": "danger", "value": 10})
    assert not ok
    assert "level" in err

    ok, err = bridge.apply_threshold({"sensor": "gas", "level": "safe", "value": "abc"})
    assert not ok
    assert "value" in err

    ok, err = bridge.apply_threshold(
        {"sensor": "gas", "level": "warning", "value": 650}
    )
    assert ok
    assert err is None
    assert bridge.thresholds["gas"]["warning"] == 650

    with open(config_path, "r", encoding="utf-8") as handle:
        saved = yaml.safe_load(handle)
    assert saved["alerts"]["gas"]["warning"] == 650
    monkeypatch.undo()


def test_handle_client_message_rejects_unknown():
    ws = FakeWebSocket()

    async def run():
        bridge.BRIDGE_STATE.write_queue = asyncio.Queue()
        await bridge.handle_client_message(ws, json.dumps({"command": "destroy"}))
        return ws.sent

    sent = asyncio.run(run())
    assert len(sent) == 1
    reply = json.loads(sent[0])
    assert reply["ack"] is False
    assert "error" in reply
    assert "timestamp" in reply


def test_handle_client_message_rejects_invalid_json():
    ws = FakeWebSocket()

    async def run():
        bridge.BRIDGE_STATE.write_queue = asyncio.Queue()
        await bridge.handle_client_message(ws, "not-json{{")
        return ws.sent

    sent = asyncio.run(run())
    assert json.loads(sent[0])["ack"] is False


def test_handle_client_message_ack_silence():
    ws = FakeWebSocket()

    async def run():
        bridge.BRIDGE_STATE.write_queue = asyncio.Queue()
        await bridge.handle_client_message(ws, json.dumps({"command": "silence"}))
        wire = await bridge.BRIDGE_STATE.write_queue.get()
        return ws.sent, wire

    sent, wire = asyncio.run(run())
    assert wire == "silence"
    reply = json.loads(sent[0])
    assert reply["ack"] is True
    assert reply["command"] == "silence"
    assert "timestamp" in reply
    assert bridge.device_state["silenced"] is True


def test_handle_client_message_toggle_armed_snapshot():
    ws = FakeWebSocket()

    async def run():
        bridge.BRIDGE_STATE.write_queue = asyncio.Queue()
        bridge.connected_clients.add(ws)
        bridge.device_state["armed"] = True
        await bridge.handle_client_message(ws, json.dumps({"command": "toggle_armed"}))
        bridge.connected_clients.discard(ws)
        return ws.sent

    sent = asyncio.run(run())
    assert bridge.device_state["armed"] is False
    # Ack followed by a state snapshot broadcast.
    assert len(sent) == 2
    assert json.loads(sent[0])["ack"] is True
    snapshot = json.loads(sent[1])
    assert snapshot["armed"] is False
