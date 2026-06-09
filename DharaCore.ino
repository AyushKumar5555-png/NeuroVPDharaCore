#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <time.h>

// ── Pin & Hardware Config ──────────────────────────────────────────────────────
#define PIN_MOIST     34
#define PIN_DHT       4
#define PIN_RELAY     26
#define DHT_TYPE      DHT22
#define OLED_W        128
#define OLED_H        64
#define OLED_ADDR     0x3C
#define OLED_RST      -1

// ── Sensor Calibration (adjust to your physical sensor) ───────────────────────
#define RAW_DRY       3200
#define RAW_WET       1100
#define THRESH_LOW    45.0f
#define THRESH_HIGH   60.0f
#define ALERT_MOIST   20.0f
#define ALERT_TEMP    38.0f
#define ALERT_HUM     20.0f

// ── WiFi ───────────────────────────────────────────────────────────────────────
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASS     "YOUR_WIFI_PASSWORD"

// ── HiveMQ Cloud (TLS port 8883) ───────────────────────────────────────────────
#define MQ_HOST       "YOUR_CLUSTER.hivemq.cloud"
#define MQ_PORT       8883
#define MQ_USER       "YOUR_HIVEMQ_USER"
#define MQ_PASS       "YOUR_HIVEMQ_PASS"
#define MQ_CLIENT_ID  "dhara-esp32-v4"
#define T_SENS        "dharacore/sensors"
#define T_PUMP_CMD    "dharacore/pump/cmd"
#define T_ALERT       "dharacore/alerts"

// ── Timing ─────────────────────────────────────────────────────────────────────
#define TELE_MS       5000UL
#define OVR_TIMEOUT   300000UL
#define NTP_SERVER    "pool.ntp.org"
#define TZ_OFFSET_SEC 19800

// ── Globals ────────────────────────────────────────────────────────────────────
DHT              _dht(PIN_DHT, DHT_TYPE);
Adafruit_SSD1306 _oled(OLED_W, OLED_H, &Wire, OLED_RST);

WiFiClientSecure _wcs;
PubSubClient     _mq(_wcs);

float  _m = 50.0f, _t = 25.0f, _h = 50.0f;
bool   _pump      = false;
bool   _override  = false;
bool   _ovr_val   = false;
ulong  _ovr_ts    = 0;
ulong  _last_tele = 0;
ulong  _last_dht  = 0;
bool   _oled_ok   = false;

// ── Helpers ────────────────────────────────────────────────────────────────────
float _raw_pct(int r) {
  return constrain(
    (float)(RAW_DRY - r) / (float)(RAW_DRY - RAW_WET) * 100.0f,
    0.0f, 100.0f
  );
}

void _relay(bool on) {
  _pump = on;
  digitalWrite(PIN_RELAY, on ? HIGH : LOW);
}

String _ts() {
  struct tm ti;
  if (!getLocalTime(&ti)) return "1970-01-01T00:00:00Z";
  char b[25];
  strftime(b, sizeof(b), "%Y-%m-%dT%H:%M:%SZ", &ti);
  return String(b);
}

// ── OLED ───────────────────────────────────────────────────────────────────────
void _draw() {
  if (!_oled_ok) return;
  _oled.clearDisplay();
  _oled.setTextSize(1);
  _oled.setTextColor(SSD1306_WHITE);
  _oled.setCursor(0, 0);  _oled.println("=  Dhara Core  =");
  _oled.print("Moist : "); _oled.print(_m, 1); _oled.println(" %");
  _oled.print("Temp  : "); _oled.print(_t, 1); _oled.println(" C");
  _oled.print("Humid : "); _oled.print(_h, 1); _oled.println(" %");
  _oled.print("Pump  : "); _oled.println(_pump ? "ON" : "OFF");
  if (_override)           _oled.println("[OVERRIDE]");
  _oled.display();
}

// ── MQTT callback ──────────────────────────────────────────────────────────────
void _mq_cb(char* topic, byte* payload, unsigned int len) {
  if (len == 0 || len > 256) return;
  char buf[257];
  memcpy(buf, payload, len);
  buf[len] = '\0';
  StaticJsonDocument<128> doc;
  if (deserializeJson(doc, buf) != DeserializationError::Ok) return;
  if (strcmp(topic, T_PUMP_CMD) == 0 && doc.containsKey("pump")) {
    _override  = true;
    _ovr_val   = doc["pump"].as<bool>();
    _ovr_ts    = millis();
    _relay(_ovr_val);
  }
}

// ── WiFi ───────────────────────────────────────────────────────────────────────
void _wifi_up() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(500);
}

void _ntp_up() {
  configTime(TZ_OFFSET_SEC, 0, NTP_SERVER);
  struct tm ti;
  for (int i = 0; i < 10 && !getLocalTime(&ti); i++) delay(500);
}

// ── MQTT ───────────────────────────────────────────────────────────────────────
void _mq_up() {
  if (_mq.connected()) return;
  _wcs.setInsecure();
  _mq.setServer(MQ_HOST, MQ_PORT);
  _mq.setCallback(_mq_cb);
  _mq.setKeepAlive(60);
  _mq.setSocketTimeout(10);
  for (int i = 0; i < 5 && !_mq.connected(); i++) {
    _mq.connect(MQ_CLIENT_ID, MQ_USER, MQ_PASS);
    if (!_mq.connected()) delay(1000);
  }
  if (_mq.connected()) _mq.subscribe(T_PUMP_CMD, 1);
}

// ── Publish sensor telemetry ───────────────────────────────────────────────────
void _publish() {
  if (!_mq.connected()) return;
  StaticJsonDocument<192> doc;
  doc["m"]    = round(_m * 10.0f) / 10.0f;
  doc["t"]    = round(_t * 10.0f) / 10.0f;
  doc["h"]    = round(_h * 10.0f) / 10.0f;
  doc["pump"] = _pump;
  doc["ts"]   = _ts();
  char buf[192];
  serializeJson(doc, buf);
  _mq.publish(T_SENS, buf, false);
}

// ── Publish edge alerts ────────────────────────────────────────────────────────
void _pub_alert(const char* lvl, const char* msg) {
  if (!_mq.connected()) return;
  StaticJsonDocument<128> doc;
  doc["level"] = lvl;
  doc["msg"]   = msg;
  doc["ts"]    = _ts();
  char buf[128];
  serializeJson(doc, buf);
  _mq.publish(T_ALERT, buf, false);
}

void _check_alerts() {
  if (_m < ALERT_MOIST) _pub_alert("critical", "Critically low moisture - crop stress");
  if (_t > ALERT_TEMP)  _pub_alert("warning",  "High temperature - heat stress risk");
  if (_h < ALERT_HUM)   _pub_alert("warning",  "Low humidity - high evapotranspiration");
}

// ── Setup ──────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, LOW);
  _dht.begin();
  Wire.begin();
  _oled_ok = _oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (_oled_ok) { _oled.clearDisplay(); _oled.display(); }
  _wifi_up();
  _ntp_up();
  _mq_up();
}

// ── Loop ───────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) { _wifi_up(); return; }
  if (!_mq.connected()) _mq_up();
  _mq.loop();

  if (_override && (millis() - _ovr_ts > OVR_TIMEOUT)) _override = false;

  _m = _raw_pct(analogRead(PIN_MOIST));

  if (millis() - _last_dht > 2000) {
    float ht = _dht.readTemperature();
    float hh = _dht.readHumidity();
    if (!isnan(ht) && ht >= -40.0f && ht <= 80.0f) _t = ht;
    if (!isnan(hh) && hh >=   0.0f && hh <= 100.0f) _h = hh;
    _last_dht = millis();
  }

  if (!_override) {
    if      (_m < THRESH_LOW)  _relay(true);
    else if (_m > THRESH_HIGH) _relay(false);
  }

  _draw();

  if (millis() - _last_tele >= TELE_MS) {
    _last_tele = millis();
    _publish();
    _check_alerts();
  }

  delay(100);
}
