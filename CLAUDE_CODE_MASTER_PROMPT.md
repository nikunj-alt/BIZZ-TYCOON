# GASTECT — Master Implementation Prompt for Claude Code

> Paste this entire file into Claude Code at the root of `GASTECT_Project`.
> It contains the full plan: what is done, what remains, exactly how to do it, and how to verify.
> Work through the phases **in order**. Do not skip verification steps.

---

## 0. Context

GASTECT is an IoT gas-leak + fire detection system for the Bizz Tycoons competition (Dec 15, 2026).
Stack: Arduino Uno firmware (`arduino/GASTECT_Arduino.ino`) → HC-05 Bluetooth serial → Python WebSocket bridge (`bridge/bridge.py`, port 8765) → SQLite (`database/history.db`) → Next.js 14 website (`website/`, port 3000).

An audit was already done. The PRD is `PRD_setup.md`. The WebSocket API contract is `docs/api_spec.md`.

**Repo:** `https://github.com/nikunj-alt/BIZZ-TYCOON` (branch `main`). Commit and push when a phase is fully verified.

### Already done (do NOT redo)
- Next.js 14 + React 18 + TS website builds (`next build` passes). Pages `/` and `/about` use `getServerSideProps` + `next/dynamic({ssr:false})` for R3F — this fixes the prerender stack overflow. Keep it.
- R3F 3D components in `website/components/three/r3f/` (StatusOrb, GasParticleField, FlameVisualization, PPMWaveform, SensorGrid3D, HistoryChart3DCore, HomeCanvasContent, AboutBackground, ThreeCanvas with client-mount guard).
- UI components in `website/components/ui/` (Navigation, HeroSection, ReadingCard, ControlPanel, AlertBanner+Toast, SensorGrid 2D/3D, HistoryChart3D, Footer) + `design-system.css` + Framer Motion animations with reduced-motion support.
- Bridge: serial auto-detect, WS broadcast loop, serial auto-retry, SQLite writes, DB init.
- Scripts `setup.sh` / `start.sh` / `start-vercel-mode.sh`, Dockerfile, vercel.json, pylint workflow, docs.

### The bug list (what remains) — work these in phase order

---

## Phase 1 — Bridge command handler (bridge.py)

**Problem:** `bridge.py` `handler()` ignores all client→server commands (`pass` at line ~102). The website sends `silence`, `evacuate`, `servo`, `calibrate`, `reset`, `test_alarm`, `set_threshold`, `toggle_armed` — none work.

**Do this:**
1. Add a global `serial_writer` lock/queue. Create an `asyncio.Queue` named `outgoing` that the broadcast loop drains and writes to the serial port.
2. In `handler()`, parse incoming messages with `json.loads`. If the message has a `command` field:
   - Validate the command against an allowlist: `silence`, `evacuate`, `servo` (with `angle` 0–180), `calibrate`, `reset`, `test_alarm`, `set_threshold` (with `warn`, `danger`), `toggle_armed`.
   - Forward a compact JSON line to the Arduino via the outgoing queue, e.g. `{"cmd":"silence"}`.
   - Send an ack to the client exactly per `docs/api_spec.md`: `{"ack": true, "command": "...", "timestamp": "<ISO8601>"}`.
   - On invalid command, send `{"ack": false, "error": "unknown_command"}`.
3. `set_threshold`: also persist to `config/config.yaml` under `alerts:` AND broadcast `{"type": "threshold_update", "warn": W, "danger": D}` to all clients (the website already handles this message type in `pages/index.tsx`).
4. Read the `alerts:` section of `config.yaml` in `load_config()` (currently ignored) and include `warn`/`danger`/`flame_warn`/`flame_danger` in the returned config. Broadcast `threshold_update` to every newly connected client.
5. Add `timestamp` (ISO 8601 UTC) to every broadcast payload — the API spec promises it and the website charts need it.
6. Keep the existing serial retry loop. Guard the outgoing-queue drain so a disconnected serial port doesn't crash the task.

**Verify:** `python bridge/init_db.py` runs; start `bridge.py` with no Arduino attached (it should still start the WS server and retry serial); connect a test WS client (`python -c "import asyncio,websockets,json; asyncio.run(...)"` or `npx wscat -c ws://localhost:8765`), send `{"command":"silence"}` and confirm you receive the ack JSON. `pylint bridge/` passes (CI enforces it).

---

## Phase 2 — Arduino firmware completion (arduino/GASTECT_Arduino.ino)

**Problem:** Firmware reads sensors but: never receives serial commands, never drives the servo, never drives a 7-segment display, doesn't send `armed`/`silenced`/`joy_*`/`timestamp`, sends raw ADC instead of PPM, and doesn't use the touch sensor to silence.

**Do this (keep the existing pin map):**
1. **Serial command input:** in `loop()`, check `Serial.available()`; read a line; parse the simple JSON with a minimal parser (or parse `"cmd":"value"` substrings — no ArduinoJson lib needed). Handle: `silence` (set `silenced=true`, buzzer LOW), `test_alarm` (buzzer HIGH 3s), `reset` (silenced=false, servo to 0), `calibrate` (sample MQ2 in clean air for baseline), `servo` + `angle` (clamp 0–180, `servo.write(angle)`), `set_threshold` + `warn`/`danger` (store in RAM vars, use them instead of hardcoded 200/500), `toggle_armed` (flip `armed`; when disarmed, buzzer stays off but status still computes).
2. **Servo:** `#include <Servo.h>`, `Servo gasValve; gasValve.attach(pinServo);` init to 0° (open). On DANGER and armed → close valve (180°). On `reset`/`silence`+`safe` → reopen.
3. **7-segment display:** implement a 4-digit 7-segment driver on pins 10–13 (shift-register style or direct segment pins — choose direct: declare segment pins a–g + 4 digit pins) and show the PPM value, refreshing in `loop()`. If using TM1637, use pins 10 (CLK) / 11 (DIO). Document the wiring in `docs/`.
4. **PPM calibration:** convert MQ2 raw ADC to PPM with the standard MQ2 formula using a calibrated `RS_air` baseline from `calibrate` (or a constant). Clamp 0–10000 (PRD FR-1).
5. **Joystick:** read A3/A4/pin4, include `"joy_x"`, `"joy_y"`, `"joy_btn"` in the JSON output.
6. **Extra fields:** add `"armed"`, `"silenced"`, `"servo"` (current angle) to the JSON line. Add `"timestamp"` if you can (millis-based is fine: `"uptime_ms"`).
7. **Touch silence:** when touch pressed (and DANGER/WARNING), set `silenced=true` for 30s.
8. **Flame logic:** use flame thresholds too (from config defaults: warn 200 / danger 400 on the raw scale — note flame sensor reads *lower* when flame present for many modules; document which and code accordingly).
9. **Low battery:** if `battery < 20`, blink yellow LED even in SAFE (NFR-2 visibility).
10. Keep the 1-second `delay(1000)` cadence (FR-4) but make non-blocking if you add command handling — use `millis()` timing so serial commands are processed promptly.

**Verify:** code compiles in Arduino IDE / PlatformIO (`pio run` if configured, else eyeball + document). JSON output line contains all fields: `ppm, flame, ldr, motion, touch, battery, status, armed, silenced, servo, joy_x, joy_y, joy_btn`.

---

## Phase 3 — Website fixes

1. **Delete stale pages:** remove `website/pages/index.js` and `website/pages/about.js` (they conflict with the `.tsx` versions and will double-build).
2. **Responsive dashboard:** in `pages/index.tsx` replace the hardcoded `gridTemplateColumns: '1fr 320px'` with a CSS class that collapses to 1 column under 1024px. Add the media query to `design-system.css`. Also make `ReadingCardGrid` columns responsive.
3. **WebSocket reconnect with backoff** (per `docs/api_spec.md`): replace the current reload-on-close with the spec's reconnect strategy (max 10 attempts, `2000 * attempt` ms backoff). Show a "reconnecting…" toast.
4. **History from SQLite:** add `website/pages/api/history.ts` (Next.js API route) that opens `database/history.db` read-only (`sqlite3` npm package or better: query via a tiny Python call — simplest: add `better-sqlite3` as a dependency) and returns the last N readings as JSON. On dashboard mount, `fetch('/api/history?limit=200')` to seed the history chart before live WS data arrives.
5. **About page honesty:** fix the claims in `pages/about.tsx` — change "17 Hardware Sensors" to the real count, remove the "15-Language/Multilingual" claim unless you implement i18n (out of scope — remove it), remove "auto-evacuation triggers" until Phase 2 servo logic exists (then re-add).
6. **HeroSection buttons:** wire the "Silence Alarm" and "Test Sensors" buttons in `HeroSection.tsx` to actually call the command sender (currently dead buttons) — pass `onSilence`/`onTest` props from `index.tsx`.
7. **package.json:** bump declared deps to match installed reality (next ^14.2.0, react ^18.3.0, typescript ^5.x) and add `@react-three/fiber`, `@react-three/drei`, `three`, `framer-motion`, `clsx`, `zustand` (if used), `better-sqlite3` (Phase 3.4). Run `npm install` to sync `package-lock.json`.

**Verify:** `npm run build` passes clean. `npm run dev`, open http://localhost:3000, confirm dashboard renders, no console errors, responsive at 375px width (mobile) and 1440px.

---

## Phase 4 — End-to-end + polish

1. **Simulated end-to-end test:** write `bridge/simulate.py` — a fake Arduino that prints the full JSON line every second with varying ppm (SAFE→WARNING→DANGER→SAFE cycle). Point `config/config.yaml` `serial.port` at a virtual port or make the bridge accept a `--simulate` flag that skips serial and uses the simulator. Verify the dashboard shows the full alert cycle and the SQLite DB gets rows.
2. **Docs update:** update `docs/api_spec.md` if the message schema changed; update `README.md` project structure (it still lists old `.js` pages); update `docs/test_protocols.md` to match reality.
3. **Tests:** add `bridge/test_bridge.py` (pytest) covering: config loading, command validation/ack, threshold broadcast, DB insert. Add a GitHub Actions step or extend pylint workflow to run pytest.
4. **Final build + push:** `npm run build` in `website/`, run `pylint bridge/`, run `pytest bridge/`, then `git add -A && git commit && git push origin main`.

---

## Rules for every phase

- Match existing code style (the repo uses `'use client'` directives, CSS custom properties, inline styles + a design-system.css).
- Never break `npm run build` — run it after every website change.
- Never break `pylint bridge/` — it runs in CI.
- Keep the R3F SSR workaround (`getServerSideProps` + `dynamic(ssr:false)` + mounted guard in `ThreeCanvas.tsx`) — do not "simplify" it away.
- Commit per phase with a clear message; push at the end of each phase.
- If hardware (Arduino) is not connected, verify bridge/website behavior with the simulator from Phase 4.1.

## Done criteria

- `./scripts/setup.sh` then `./scripts/start.sh` → dashboard at :3000 connects to WS at :8765, shows live data, silence/servo/threshold commands produce acks, history chart seeded from SQLite, mobile layout works, `next build` and `pylint` and `pytest` all green, everything pushed to `nikunj-alt/BIZZ-TYCOON` main.
