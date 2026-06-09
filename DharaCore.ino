#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <time.h>

#define PIN_MOIST     34
#define PIN_DHT       4
#define PIN_RELAY     26
#define DHT_TYPE      DHT22
#define LCD_ADDR      0x3F
#define LCD_COLS      16
#define LCD_ROWS      2

#define RAW_DRY       3200
#define RAW_WET       1100
#define THRESH_LOW    45.0f
#define THRESH_HIGH   60.0f
#define ALERT_MOIST   20.0f
#define ALERT_TEMP    38.0f
#define ALERT_HUM     20.0f

#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASS     "YOUR_WIFI_PASSWORD"

#define MQ_HOST       "YOUR_CLUSTER.hivemq.cloud"
#define MQ_PORT       8883
#define MQ_USER       "YOUR_HIVEMQ_USER"
#define MQ_PASS       "YOUR_HIVEMQ_PASS"
#define MQ_CLIENT_ID  "dhara-esp32-v4"
#define T_SENS        "dharacore/sensors"
#define T_PUMP_CMD    "dharacore/pump/cmd"
#define T_ALERT       "dharacore/alerts"

#define TELE_MS       5000UL
#define OVR_TIMEOUT   300000UL
#define NTP_SERVER    "pool.ntp.org"
#define TZ_OFFSET_SEC 19800

DHT              _dht(PIN_DHT, DHT_TYPE);
LiquidCrystal_I2C _lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
WiFiClientSecure _wcs;
PubSubClient     _mq(_wcs);

float  _m = 50.0f, _t = 25.0f, _h = 50.0f;
bool   _pump      = false;
bool   _override  = false;
bool   _ovr_val   = false;
ulong  _ovr_ts    = 0;
ulong  _last_tele = 0;
ulong  _last_dht  = 0;
ulong  _last_draw = 0;
bool   _draw_page = false;

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

void _draw() {
  if (millis() - _last_draw < 2000) return;
  _last_draw = millis();

  // Row 0: NeuroVP T:XX.XC
  _lcd.setCursor(0, 0);
  _lcd.print("NeuroVP T:");
  _lcd.print(_t, 1);
  _lcd.print("C ");

  // Row 1: M:XX.X% H:XX.X%
  _lcd.setCursor(0, 1);
  _lcd.print("M:");
  _lcd.print(_m, 1);
  _lcd.print("% H:");
  _lcd.print(_h, 1);
  _lcd.print("% ");
}

void _mq_cb(char* topic, byte* payload, unsigned int len) {
  if (len == 0 || len > 256) return;
  char buf[257];
  memcpy(buf, payload, len);
  buf[len] = '\0';
  StaticJsonDocument<128> doc;
  if (deserializeJson(doc, buf) != DeserializationError::Ok) return;
  if (strcmp(topic, T_PUMP_CMD) == 0 && doc.containsKey("pump")) {
    _override = true;
    _ovr_val  = doc["pump"].as<bool>();
    _ovr_ts   = millis();
    _relay(_ovr_val);
  }
}

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

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_MOIST, INPUT);
  digitalWrite(PIN_RELAY, LOW);
  _dht.begin();
  Wire.begin(21, 22);
  _lcd.init();
  _lcd.backlight();
  _lcd.setCursor(0, 0);
  _lcd.print("    NeuroVP     ");
  _lcd.setCursor(0, 1);
  _lcd.print("Initializing...");
  _wifi_up();
  if(WiFi.status() == WL_CONNECTED) {
    _ntp_up();
    _mq_up();
  }
  _lcd.clear();
}

ulong _last_wifi_retry = 0;

void loop() {
  // 1. Non-blocking Wi-Fi reconnect (try every 10 seconds if disconnected)
  if (WiFi.status() != WL_CONNECTED) { 
    if (millis() - _last_wifi_retry > 10000) {
      _last_wifi_retry = millis();
      WiFi.begin(WIFI_SSID, WIFI_PASS);
    }
  } else {
    // 2. Only process MQTT if Wi-Fi is connected
    if (!_mq.connected()) _mq_up();
    _mq.loop();
  }

  // 3. Clear override if timeout
  if (_override && (millis() - _ovr_ts > OVR_TIMEOUT)) _override = false;

  // 4. ALWAYS read soil moisture (even offline)
  _m = _raw_pct(analogRead(PIN_MOIST));

  // 5. ALWAYS read DHT (even offline)
  if (millis() - _last_dht > 2000) {
    float ht = _dht.readTemperature();
    float hh = _dht.readHumidity();
    if (!isnan(ht) && ht >= -40.0f && ht <= 80.0f)  _t = ht;
    if (!isnan(hh) && hh >=   0.0f && hh <= 100.0f) _h = hh;
    _last_dht = millis();
  }

  // 6. Automatic irrigation logic
  if (!_override) {
    if      (_m < THRESH_LOW)  _relay(true);
    else if (_m > THRESH_HIGH) _relay(false);
  }

  // 7. ALWAYS update the LCD
  _draw();

  // 8. Publish telemetry if connected
  if (WiFi.status() == WL_CONNECTED && millis() - _last_tele >= TELE_MS) {
    _last_tele = millis();
    _publish();
    _check_alerts();
  }

  delay(100);
}
