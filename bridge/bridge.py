"""Python WebSocket bridge and serial reader for the GASTECT IoT system.

The bridge sits between the Arduino (over serial / HC-05) and the browser
dashboard. It:

* reads JSON telemetry lines from the serial port,
* classifies each reading into SAFE/WARNING/DANGER using configured thresholds,
* persists every reading to SQLite,
* broadcasts readings to every connected WebSocket client (with a timestamp),
  and
* relays validated control commands from clients back to the device, replying
  with ack/nack messages and persisting threshold changes.
"""
import argparse
import asyncio
import json
import math
import os
import sqlite3
from datetime import datetime, timezone
from types import SimpleNamespace

import serial
import serial.tools.list_ports
import websockets
import yaml

from init_db import ensure_extra_columns, init_db

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Control commands clients are allowed to issue.
ALLOWED_COMMANDS = frozenset([
    "silence",
    "evacuate",
    "servo",
    "calibrate",
    "reset",
    "test_alarm",
    "set_threshold",
    "toggle_armed",
])

# Sensors whose alert thresholds may be tuned at runtime.
THRESHOLD_SENSORS = frozenset(["gas", "flame"])
# Threshold levels that are user-configurable per sensor.
THRESHOLD_LEVELS = frozenset(["safe", "warning"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "config", "config.yaml"))
DB_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "database", "history.db"))

# Serial reconnect back-off (seconds), doubled on each attempt.
MAX_RECONNECT_DELAY = 10

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------

# Set of connected WebSocket client objects.
connected_clients = set()

# Shared mutable runtime state (avoids the ``global`` keyword).
BRIDGE_STATE = SimpleNamespace(write_queue=None)
SERIAL_STATE = SimpleNamespace(ser=None)

# Mirror of the device's current arming / silencing state. The firmware is
# authoritative; these values are used as defaults before first telemetry and
# are kept in sync with incoming readings.
device_state = {"armed": True, "silenced": False}

# Latest telemetry seen (used to build immediate state snapshots).
latest_readings = {}

# Loaded alert thresholds, keyed by sensor then level.
thresholds = {"gas": {"safe": 200, "warning": 500},
              "flame": {"safe": 200, "warning": 400}}

# When True, the bridge runs without hardware using synthetic telemetry.
SIMULATE = False


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def utc_now():
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def detect_serial_port():
    """Detect available Arduino COM ports automatically."""
    try:
        ports = [port.device for port in serial.tools.list_ports.comports()]
    except (serial.SerialException, OSError):
        ports = []

    preferred = [
        "COM3", "COM4", "COM5",
        "/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0", "/dev/ttyACM1",
        "/dev/serial0", "/dev/serial1",
    ]

    for port in preferred:
        if port in ports:
            return port

    return ports[0] if ports else None


def _parse_thresholds(raw):
    """Extract per-sensor thresholds from the raw YAML config."""
    alerts = raw.get("alerts", {}) if isinstance(raw, dict) else {}
    defaults = {"gas": {"safe": 200, "warning": 500},
                "flame": {"safe": 200, "warning": 400}}
    parsed = {}
    for sensor, fallback in defaults.items():
        section = alerts.get(sensor, {}) if isinstance(alerts, dict) else {}
        parsed[sensor] = {
            "safe": int(section.get("safe", fallback["safe"])),
            "warning": int(section.get("warning", fallback["warning"])),
        }
    return parsed


def load_config():
    """Load and validate configuration from config.yaml."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
            raw_config = yaml.safe_load(handle) or {}
    except FileNotFoundError as exc:
        raise RuntimeError(f"Configuration file not found: {CONFIG_PATH}") from exc

    if not isinstance(raw_config, dict):
        raise RuntimeError("Configuration file is empty or invalid.")

    serial_cfg = raw_config.get("serial", {})
    ws_cfg = raw_config.get("websocket", {})
    selected_port = serial_cfg.get("port") or detect_serial_port()

    return {
        "port": selected_port,
        "baud_rate": int(serial_cfg.get("baud_rate", 9600)),
        "ws_port": int(ws_cfg.get("port", 8765)),
        "thresholds": _parse_thresholds(raw_config),
    }


def classify_status(readings, active_thresholds=None):
    """Map a reading to SAFE/WARNING/DANGER using the configured thresholds."""
    active = active_thresholds or thresholds
    ppm = readings.get("ppm", 0)
    flame = readings.get("flame", 0)

    if ppm >= active["gas"]["warning"] or flame >= active["flame"]["warning"]:
        return "DANGER"
    if ppm >= active["gas"]["safe"] or flame >= active["flame"]["safe"]:
        return "WARNING"
    return "SAFE"


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_reading(data, status):
    """Save a telemetry reading to the SQLite history database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO readings
                (ppm, flame, ldr, motion, touch, battery, status, armed,
                 silenced, servo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("ppm", 0),
                data.get("flame", 0),
                data.get("ldr", 0),
                1 if data.get("motion") else 0,
                1 if data.get("touch") else 0,
                data.get("battery", 100),
                status,
                1 if data.get("armed", device_state["armed"]) else 0,
                1 if data.get("silenced", device_state["silenced"]) else 0,
                int(data.get("servo", 90)),
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as err:
        print("Database error:", err)


def _persist_thresholds():
    """Write the active thresholds back into config.yaml."""
    with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
        raw = yaml.safe_load(handle) or {}
    alerts = raw.setdefault("alerts", {})
    for sensor in THRESHOLD_SENSORS:
        section = alerts.setdefault(sensor, {})
        section["safe"] = thresholds[sensor]["safe"]
        section["warning"] = thresholds[sensor]["warning"]
    with open(CONFIG_PATH, "w", encoding="utf-8") as handle:
        yaml.safe_dump(raw, handle, sort_keys=False)


# ---------------------------------------------------------------------------
# WebSocket helpers
# ---------------------------------------------------------------------------

async def _broadcast(payload):
    """Send a JSON payload to every connected client."""
    if not connected_clients:
        return
    encoded = json.dumps(payload)
    await asyncio.gather(
        *(client.send(encoded) for client in list(connected_clients))
    )


async def _broadcast_snapshot():
    """Broadcast the current combined state snapshot."""
    payload = _format_payload(dict(latest_readings))
    await _broadcast(payload)


def _format_payload(data):
    """Enrich raw sensor data with status, defaults and a timestamp."""
    payload = dict(data)
    if "status" not in payload:
        payload["status"] = classify_status(payload)
    payload.setdefault("armed", device_state["armed"])
    payload.setdefault("silenced", device_state["silenced"])
    payload["timestamp"] = utc_now()
    return payload


async def _reply(websocket, *, ack, command, error=None):
    """Send an ack/nack response with a timestamp."""
    payload = {"ack": ack, "command": command, "timestamp": utc_now()}
    if error is not None:
        payload["error"] = error
    await websocket.send(json.dumps(payload))


def _wire_command(name, params):
    """Build the plain-text command line sent to the Arduino."""
    if name == "servo":
        angle = int(params.get("angle", params.get("value", 90)))
        return f"servo:{max(0, min(180, angle))}"
    if name == "set_threshold":
        sensor = params.get("sensor", "gas")
        level = params.get("level", "warning")
        value = int(params.get("value", 500))
        return f"set_threshold:{sensor}:{level}:{value}"
    return name


def _update_local_state(name):
    """Apply optimistic state changes so the UI responds immediately."""
    if name == "silence":
        device_state["silenced"] = True
    elif name == "evacuate":
        device_state["silenced"] = False
    elif name == "toggle_armed":
        device_state["armed"] = not device_state["armed"]
    elif name == "reset":
        device_state["armed"] = True
        device_state["silenced"] = False


def apply_threshold(params):
    """Validate and apply a set_threshold request.

    Returns ``(True, None)`` on success or ``(False, error_message)`` on
    validation failure.
    """
    sensor = params.get("sensor")
    level = params.get("level")
    value = params.get("value")

    if sensor not in THRESHOLD_SENSORS:
        return False, f"sensor must be one of {sorted(THRESHOLD_SENSORS)}"
    if level not in THRESHOLD_LEVELS:
        return False, f"level must be one of {sorted(THRESHOLD_LEVELS)}"

    try:
        value = int(value)
    except (TypeError, ValueError):
        return False, "value must be an integer"

    if value < 0:
        return False, "value must be non-negative"

    thresholds[sensor][level] = value
    _persist_thresholds()
    return True, None


# ---------------------------------------------------------------------------
# Client command handling
# ---------------------------------------------------------------------------

async def handle_client_message(websocket, message):
    """Process a single JSON command from a WebSocket client."""
    try:
        cmd = json.loads(message)
    except (json.JSONDecodeError, TypeError):
        await _reply(websocket, ack=False, command=str(message)[:64],
                     error="Invalid JSON payload")
        return

    if not isinstance(cmd, dict):
        await _reply(websocket, ack=False, command=None,
                     error="Command must be a JSON object")
        return

    name = cmd.get("command")
    if name not in ALLOWED_COMMANDS:
        await _reply(websocket, ack=False, command=name,
                     error=f"Unknown command: {name}")
        return

    params = cmd.get("params") or {}
    if not isinstance(params, dict):
        params = {}

    if name == "set_threshold":
        ok, err = apply_threshold(params)
        if not ok:
            await _reply(websocket, ack=False, command=name, error=err)
            return
        await BRIDGE_STATE.write_queue.put(_wire_command(name, params))
        await _reply(websocket, ack=True, command=name)
        await _broadcast({
            "type": "threshold_update",
            "sensor": params.get("sensor", "gas"),
            "warn": thresholds[params.get("sensor", "gas")]["safe"],
            "danger": thresholds[params.get("sensor", "gas")]["warning"],
            "timestamp": utc_now(),
        })
        return

    await BRIDGE_STATE.write_queue.put(_wire_command(name, params))
    _update_local_state(name)
    await _reply(websocket, ack=True, command=name)
    if name in ("silence", "evacuate", "toggle_armed", "reset"):
        await _broadcast_snapshot()


async def handler(websocket):
    """Handle incoming WebSocket client connections."""
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            await handle_client_message(websocket, message)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)


# ---------------------------------------------------------------------------
# Serial handling
# ---------------------------------------------------------------------------

async def serial_writer():
    """Consume the outgoing write queue and send commands to the Arduino."""
    while True:
        payload = await BRIDGE_STATE.write_queue.get()
        ser = SERIAL_STATE.ser
        if ser is None:
            continue
        try:
            ser.write((payload + "\n").encode("utf-8"))
        except (serial.SerialException, OSError):
            # The reader loop handles reconnect.
            pass


async def broadcast_serial():
    """Read serial data from the Arduino and broadcast it to clients."""
    while True:
        try:
            with serial.Serial(PORT, BAUD, timeout=1) as ser:
                SERIAL_STATE.ser = ser
                print(f"Connected to serial port {PORT} at {BAUD} baud.")
                while True:
                    line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not line:
                        await asyncio.sleep(0.05)
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if not isinstance(data, dict):
                        continue

                    # Keep local state in sync with the device.
                    if "armed" in data:
                        device_state["armed"] = bool(data["armed"])
                    if "silenced" in data:
                        device_state["silenced"] = bool(data["silenced"])
                    latest_readings.update(data)

                    payload = _format_payload(data)
                    save_reading(data, payload["status"])
                    await _broadcast(payload)
        except (serial.SerialException, OSError) as err:
            print(f"Serial connection error ({err}). Retrying in 2 seconds...")
            SERIAL_STATE.ser = None
            await asyncio.sleep(2)


async def broadcast_simulated():
    """Emit synthetic telemetry so the whole stack runs without hardware."""
    frame = 0
    baseline = 120
    while True:
        slow_drift = math.sin(frame / 8.0) * 40
        spiked = (frame % 60) > 52
        ppm = int(max(0, baseline + slow_drift + (90 if spiked else 0)))
        flame = int(max(0, 120 + math.sin(frame / 5.0) * 40))
        data = {
            "ppm": ppm,
            "flame": flame,
            "ldr": int(400 + math.sin(frame / 3.0) * 150),
            "motion": bool(frame % 30 < 2),
            "touch": False,
            "battery": 87,
            "joy_x": 512,
            "joy_y": 512,
            "joy_btn": False,
            "servo": 90,
            "armed": device_state["armed"],
            "silenced": device_state["silenced"],
        }
        latest_readings.update(data)
        payload = _format_payload(data)
        save_reading(data, payload["status"])
        await _broadcast(payload)
        frame += 1
        await asyncio.sleep(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main():
    """Start the WebSocket server and the telemetry broadcast loop."""
    init_db()
    ensure_extra_columns()
    BRIDGE_STATE.write_queue = asyncio.Queue()
    asyncio.create_task(serial_writer())
    async with websockets.serve(handler, "localhost", WS_PORT):
        print(f"WebSocket server started at ws://localhost:{WS_PORT}")
        if SIMULATE:
            print("Running in SIMULATION mode (no hardware required).")
            await broadcast_simulated()
        elif PORT is None:
            print(
                "No serial port detected. Start with --simulate to run "
                "without hardware, or connect an Arduino and check config.yaml."
            )
            return
        else:
            await broadcast_serial()


config = load_config()
PORT = config["port"]
BAUD = config["baud_rate"]
WS_PORT = config["ws_port"]
thresholds = config["thresholds"]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GASTECT bridge")
    parser.add_argument(
        "--simulate",
        action="store_true",
        help="run with synthetic telemetry (no hardware required)",
    )
    args = parser.parse_args()
    if args.simulate:
        SIMULATE = True
    asyncio.run(main())
