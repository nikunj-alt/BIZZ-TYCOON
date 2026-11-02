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

bool armed = true;
bool silenced = false;
int servoAngle = 90;

// MQ2 calibration baseline captured at startup / via `calibrate`.
int gasBaseline = 0;

Servo servo;
unsigned long lastSerialMillis = 0;
unsigned long lastLoopMillis = 0;
const unsigned long SERIAL_INTERVAL_MS = 1000;

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
// Serial command handling
// ---------------------------------------------------------------------------

void handleSetThreshold(const String& line) {
  // Format: set_threshold:<sensor>:<level>:<value>
  int first = line.indexOf(':');
  int second = line.indexOf(':', first + 1);
  int third = line.indexOf(':', second + 1);
  if (first < 0 || second < 0 || third < 0) {
    return;
  }
  String sensor = line.substring(first + 1, second);
  String level = line.substring(second + 1, third);
  unsigned int value = line.substring(third + 1).toInt();

  if (sensor == "gas") {
    if (level == "safe") thresholdGasSafe = value;
    else if (level == "warning") thresholdGasWarning = value;
  } else if (sensor == "flame") {
    if (level == "safe") thresholdFlameSafe = value;
    else if (level == "warning") thresholdFlameWarning = value;
  }
}

void processCommand(const String& line) {
  if (line == "silence") {
    silenced = true;
  } else if (line == "evacuate") {
    silenced = false;
  } else if (line == "toggle_armed") {
    armed = !armed;
  } else if (line == "reset") {
    armed = true;
    silenced = false;
  } else if (line == "calibrate") {
    gasBaseline = analogRead(pinMQ2);
  } else if (line == "test_alarm") {
    setBuzzer(true);
    delay(1000);
    setBuzzer(false);
  } else if (line.startsWith("servo:")) {
    servoAngle = constrain(line.substring(6).toInt(), 0, 180);
    servo.write(servoAngle);
  } else if (line.startsWith("set_threshold:")) {
    handleSetThreshold(line);
  }
}

void readSerialCommands() {
  while (Serial.available() > 0) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      processCommand(line);
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
  gasBaseline = analogRead(pinMQ2);
}

void loop() {
  readSerialCommands();

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
