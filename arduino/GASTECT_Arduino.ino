/*
  GASTECT — Arduino Uno Firmware
  Dual-Hazard Gas & Flame Detection System
  Bizz Tycoons Competition

  Telemetry protocol (JSON line over Serial / HC-05, 1 Hz):
    {"ppm":..,"flame":..,"ldr":..,"motion":..,"touch":..,
     "battery":..,"status":"..","armed":..,"silenced":..,
     "joy_x":..,"joy_y":..,"joy_btn":..,"servo":..}

  Serial commands (from the Python bridge):
    silence                    - silence the buzzer until next event
    evacuate                   - re-enable the buzzer
    toggle_armed               - arm/disarm the system
    reset                      - re-arm and un-silence
    servo:<angle>              - move the servo (0..180)
    calibrate                  - re-baseline the MQ2 sensor
    test_alarm                 - run a 1s audible alarm self-test
    set_threshold:<s>:<l>:<v> - update a threshold (gas/flame, safe/warning)
*/

#include <Servo.h>
#include <string.h>

// ---------------------------------------------------------------------------
// Pin definitions
// ---------------------------------------------------------------------------
const int pinMQ2 = A0;
const int pinFlame = A1;
const int pinLDR = A2;
const int pinPIR = 2;
const int pinTouch = 3;
const int pinJoystickX = A3;
const int pinJoystickY = A4;
const int pinJoystickSW = 4;
const int pinLED_Green = 5;
const int pinLED_Yellow = 6;
const int pinLED_Red = 7;
const int pinBuzzer = 8;
const int pinServo = 9;
const int pinBattery = A5;

// ---------------------------------------------------------------------------
// Configurable state
// ---------------------------------------------------------------------------

// Two-level threshold model, matching config.yaml and the API spec.
// SAFE    : below `safe`
// WARNING : `safe` .. `warning` - 1
// DANGER  : at or above `warning`
unsigned int thresholdGasSafe = 200;
unsigned int thresholdGasWarning = 500;
unsigned int thresholdFlameSafe = 200;
unsigned int thresholdFlameWarning = 400;

// Guard rails for runtime threshold updates (defense-in-depth against bad
// serial input, matching the bridge's own validation).
const unsigned int MIN_THRESHOLD = 1;
const unsigned int MAX_THRESHOLD = 10000;

bool armed = true;
bool silenced = false;
int servoAngle = 90;

// MQ2 calibration baseline captured at startup / via `calibrate`.
int gasBaseline = 0;

// A baseline is only accepted if the raw analog reading is below this value.
// Higher readings imply gas is already present, so baselining then would
// corrupt the span and skew subsequent PPM math.
const int MAX_SAFE_BASELINE = 800;

Servo servo;
unsigned long lastLoopMillis = 0;
const unsigned long SERIAL_INTERVAL_MS = 1000;

// Non-blocking alarm self-test state.
bool alarmTestActive = false;
unsigned long alarmTestEndMillis = 0;

// Fixed-size serial command buffer. The firmware never allocates dynamic
// memory; commands longer than this are safely truncated, never overrun.
const unsigned int SERIAL_BUF_SIZE = 64;
char serialBuf[SERIAL_BUF_SIZE];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Correct interpretation for the touch sensor (INPUT_PULLUP => active LOW).
bool touchPressed() {
  return digitalRead(pinTouch) == LOW;
}

// Map the MQ2 analog reading (0-1023) to a calibrated PPM-like value.
// Without a proper sensor curve we use a ratio against the baseline so the
// demo responds sensibly: 0 -> ~0 ppm, baseline -> ~80 ppm, 1023 -> full scale.
int readPPM() {
  int raw = analogRead(pinMQ2);
  int span = max(1, 1023 - gasBaseline);
  long ppm = 80L + ((long)max(0, raw - gasBaseline) * 920L) / span;
  return (int)min(9999L, ppm);
}

String classifyStatus(int ppm, int flame) {
  if (ppm >= thresholdGasWarning || flame >= thresholdFlameWarning) {
    return "DANGER";
  }
  if (ppm >= thresholdGasSafe || flame >= thresholdFlameSafe) {
    return "WARNING";
  }
  return "SAFE";
}

void setIndicatorLEDs(const String& status) {
  digitalWrite(pinLED_Red, status == "DANGER" ? HIGH : LOW);
  digitalWrite(pinLED_Yellow, status == "WARNING" ? HIGH : LOW);
  digitalWrite(pinLED_Green, status == "SAFE" ? HIGH : LOW);
}

void setBuzzer(bool on) {
  // The buzzer can be silenced via the `silence` command.
  digitalWrite(pinBuzzer, (on && armed && !silenced) ? HIGH : LOW);
}

void printTelemetry(int ppm, int flame) {
  Serial.print("{\"ppm\":");
  Serial.print(ppm);
  Serial.print(",\"flame\":");
  Serial.print(flame);
  Serial.print(",\"ldr\":");
  Serial.print(analogRead(pinLDR));
  Serial.print(",\"motion\":");
  Serial.print(digitalRead(pinPIR) ? "true" : "false");
  Serial.print(",\"touch\":");
  Serial.print(touchPressed() ? "true" : "false");
  Serial.print(",\"battery\":");
  Serial.print(map(analogRead(pinBattery), 0, 1023, 0, 100));
  Serial.print(",\"status\":\"");
  Serial.print(classifyStatus(ppm, flame));
  Serial.print("\",\"armed\":");
  Serial.print(armed ? "true" : "false");
  Serial.print(",\"silenced\":");
  Serial.print(silenced ? "true" : "false");
  Serial.print(",\"joy_x\":");
  Serial.print(analogRead(pinJoystickX));
  Serial.print(",\"joy_y\":");
  Serial.print(analogRead(pinJoystickY));
  Serial.print(",\"joy_btn\":");
  Serial.print(digitalRead(pinJoystickSW) == LOW ? "true" : "false");
  Serial.print(",\"servo\":");
  Serial.print(servoAngle);
  Serial.println("}");
}

// ---------------------------------------------------------------------------
// Serial command handling (fixed-size buffers, no dynamic allocation)
// ---------------------------------------------------------------------------

void handleSetThreshold(const char* arg) {
  // arg points past "set_threshold:" => "sensor:level:value"
  char sensor[8];
  char level[8];
  int value = 0;
  if (sscanf(arg, "%7s:%7s:%d", sensor, level, &value) != 3) {
    return;
  }

  // Reject out-of-range values; never let thresholds cross.
  if (value < (int)MIN_THRESHOLD || value > (int)MAX_THRESHOLD) {
    return;
  }

  if (strcmp(sensor, "gas") == 0) {
    if (strcmp(level, "safe") == 0) {
      if (value < (int)thresholdGasWarning) thresholdGasSafe = value;
    } else if (strcmp(level, "warning") == 0) {
      if (value > (int)thresholdGasSafe) thresholdGasWarning = value;
    }
  } else if (strcmp(sensor, "flame") == 0) {
    if (strcmp(level, "safe") == 0) {
      if (value < (int)thresholdFlameWarning) thresholdFlameSafe = value;
    } else if (strcmp(level, "warning") == 0) {
      if (value > (int)thresholdFlameSafe) thresholdFlameWarning = value;
    }
  }
}

void processCommand(const char* line) {
  if (strcmp(line, "silence") == 0) {
    silenced = true;
  } else if (strcmp(line, "evacuate") == 0) {
    silenced = false;
  } else if (strcmp(line, "toggle_armed") == 0) {
    armed = !armed;
  } else if (strcmp(line, "reset") == 0) {
    armed = true;
    silenced = false;
  } else if (strcmp(line, "calibrate") == 0) {
    int reading = analogRead(pinMQ2);
    if (reading < MAX_SAFE_BASELINE) {
      gasBaseline = reading;
    }
  } else if (strcmp(line, "test_alarm") == 0) {
    alarmTestActive = true;
    alarmTestEndMillis = millis() + 1000;
  } else if (strncmp(line, "servo:", 6) == 0) {
    servoAngle = constrain(atoi(line + 6), 0, 180);
    servo.write(servoAngle);
  } else if (strncmp(line, "set_threshold:", 14) == 0) {
    handleSetThreshold(line + 14);
  }
}

void readSerialCommands() {
  while (Serial.available() > 0) {
    unsigned int n = Serial.readBytesUntil('\n', serialBuf, SERIAL_BUF_SIZE - 1);
    if (n == 0) continue;
    serialBuf[n] = '\0';

    // Trim trailing whitespace / carriage return.
    while (n > 0) {
      char c = serialBuf[n - 1];
      if (c == ' ' || c == '\t' || c == '\r') {
        serialBuf[n - 1] = '\0';
        n--;
      } else {
        break;
      }
    }
    if (n > 0) {
      processCommand(serialBuf);
    }
  }
}

// ---------------------------------------------------------------------------
// Setup / loop
// ---------------------------------------------------------------------------

void setup() {
  Serial.begin(9600);
  pinMode(pinPIR, INPUT);
  pinMode(pinTouch, INPUT_PULLUP);
  pinMode(pinJoystickSW, INPUT_PULLUP);
  pinMode(pinLED_Green, OUTPUT);
  pinMode(pinLED_Yellow, OUTPUT);
  pinMode(pinLED_Red, OUTPUT);
  pinMode(pinBuzzer, OUTPUT);
  servo.attach(pinServo);
  servo.write(servoAngle);

  // Allow the MQ2 a moment to stabilize, then capture a baseline.
  delay(2000);
  int startup = analogRead(pinMQ2);
  if (startup < MAX_SAFE_BASELINE) {
    gasBaseline = startup;
  }
}

void loop() {
  readSerialCommands();

  // Non-blocking alarm self-test: keep the loop responsive.
  if (alarmTestActive) {
    if ((long)(millis() - alarmTestEndMillis) >= 0) {
      alarmTestActive = false;
      setBuzzer(false);
    } else {
      setBuzzer(true);
    }
  }

  unsigned long now = millis();
  if (now - lastLoopMillis >= SERIAL_INTERVAL_MS) {
    lastLoopMillis = now;

    int ppm = readPPM();
    int flame = analogRead(pinFlame);
    String status = classifyStatus(ppm, flame);

    setIndicatorLEDs(status);
    setBuzzer(status == "DANGER");
    printTelemetry(ppm, flame);
  }
}
