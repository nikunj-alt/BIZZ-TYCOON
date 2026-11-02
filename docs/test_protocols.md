# GASTECT Test Protocols & Scenarios

Threshold model (two-level, from `config/config.yaml`):

| Sensor  | SAFE (< safe) | WARNING (safe–warning) | DANGER (≥ warning) |
|---------|---------------|------------------------|--------------------|
| Gas     | < 200 PPM     | 200–499 PPM            | ≥ 500 PPM          |
| Flame   | < 200         | 200–399                | ≥ 400              |

Overall system status escalates to DANGER if **either** gas ≥ warning threshold **or** flame ≥ warning threshold.

## Test 1: Normal Operation (SAFE)
- **Setup:** Clean air environment, no gas, no flame, room well-lit (LDR high).
- **Expected Output:**
  - MQ2 PPM < 200
  - Flame reading < 200
  - Status banner: **SAFE (Green)**
  - Dashboard reading card shows current PPM (e.g. `0042`)

## Test 2: Gas Leak Simulation (WARNING / DANGER)
- **Setup:** Introduce lighter gas or smoke near MQ2 sensor.
- **Expected Output:**
  - MQ2 PPM rises above 200 (WARNING) or 500 (DANGER)
  - Status banner turns **YELLOW (WARNING)** or **RED (DANGER)**
  - Buzzer triggers audible tone (when armed and not silenced)
  - WebSocket broadcasts JSON telemetry instantly to web dashboard

## Test 3: Flame Detection (DANGER)
- **Setup:** Light match or lighter within 20cm of IR flame sensor.
- **Expected Output:**
  - Flame analog reading rises above 400
  - Status changes immediately to **DANGER** (even if gas is low)
  - Alarm tone active; dashboard alert banner shows CRITICAL state

## Test 4: Touch Sensor Alarm Silence
- **Setup:** Trigger hazard state, then press physical touch sensor on Arduino.
- **Expected Output:**
  - Buzzer mutes / silences
  - Web dashboard reflects touch sensor state (`Touched / Silenced`)

## Test 5: Historical Logging Persistence
- **Setup:** Run system for 5 minutes with various sensor inputs.
- **Expected Output:**
  - Check `database/history.db` SQLite table `readings`.
  - Verify records are correctly stored with timestamps, PPM, flame, and status.
  - Confirm the dashboard `/api/history` endpoint returns the stored rows in chronological order.

## Test 6: WebSocket Command Contract
- **Setup:** Connect a WebSocket client to `ws://localhost:8765`.
- **Expected Output:**
  - Client JSON must be `{ "command": "...", "params": {...} }`.
  - Accepted commands: `silence`, `evacuate`, `servo`, `calibrate`, `reset`, `test_alarm`, `set_threshold`, `toggle_armed`.
  - `set_threshold` requires `{sensor, level, value}` with `sensor ∈ {gas, flame}` and `level ∈ {safe, warning}`.
