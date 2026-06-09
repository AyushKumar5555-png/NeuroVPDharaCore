import os
import json
import time
import threading
import uvicorn
import paho.mqtt.client as mqtt
import firebase_admin
import google.generativeai as genai
from firebase_admin import credentials, db
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

app = FastAPI(title="Neuro VP Dhara Core API", description="Production-ready FastAPI backend for Smart Irrigation & Farming Assistant")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Failsafe Services Initialization ---

# 1. Firebase Admin
firebase_active = False
try:
    cred_path = os.getenv("FIREBASE_CRED_PATH", "serviceAccountKey.json")
    db_url = os.getenv("FIREBASE_DB_URL")
    
    if os.path.exists(cred_path) and db_url:
        _cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(_cred, {"databaseURL": db_url})
        firebase_active = True
        print("[INFO] Firebase Admin initialized successfully.")
    else:
        print("[WARNING] Firebase credentials or database URL missing. Running in local/mock database mode.")
except Exception as e:
    print(f"[ERROR] Failed to initialize Firebase: {e}. Running in local/mock database mode.")

# 2. Gemini AI
gemini_active = False
try:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        genai.configure(api_key=gemini_key)
        _gem = genai.GenerativeModel("gemini-1.5-flash")
        gemini_active = True
        print("[INFO] Google Gemini AI configured successfully.")
    else:
        print("[WARNING] GEMINI_API_KEY missing. Running in local/fallback AI assistant mode.")
except Exception as e:
    print(f"[ERROR] Failed to configure Gemini AI: {e}. Running in local/fallback AI assistant mode.")

# 3. MQTT Client Setup
mqtt_active = False
_live: dict = {
    "m": 51.8,
    "t": 30.5,
    "h": 65.3,
    "pump": False,
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
}

_mq_host = os.getenv("HIVEMQ_HOST", "broker.hivemq.com")
try:
    _mq_port = int(os.getenv("HIVEMQ_PORT", 1883))
except:
    _mq_port = 1883
_mq_user = os.getenv("HIVEMQ_USER", "")
_mq_pass = os.getenv("HIVEMQ_PASS", "")
_mq_topic_state = os.getenv("MQTT_TOPIC_STATE", "dharacore/sensors")
_mq_topic_pump = os.getenv("MQTT_TOPIC_PUMP", "dharacore/pump/cmd")

def _on_connect(c, ud, flags, rc):
    print(f"[INFO] MQTT client connected with result code {rc}")
    c.subscribe(_mq_topic_state)

def _on_msg(c, ud, msg):
    global _live
    try:
        payload_data = json.loads(msg.payload.decode())
        _live.update(payload_data)
        _live["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        print(f"[MQTT] State update received: {_live}")
        
        # Write to Firebase if active
        if firebase_active:
            try:
                db.reference("/state").set(_live)
                # Save to history with clean timestamp key
                timestamp_key = _live["ts"].replace(".", "_").replace(":", "_").replace("-", "_")
                db.reference(f"/history/{timestamp_key}").set(_live)
            except Exception as fe:
                print(f"[ERROR] Firebase write failed in MQTT handler: {fe}")
    except Exception as e:
        print(f"[ERROR] Failed to parse MQTT payload: {e}")

_mc = mqtt.Client(client_id="dhara-backend-core", clean_session=True)
if _mq_user:
    _mc.username_pw_set(_mq_user, _mq_pass)
_mc.on_connect = _on_connect
_mc.on_message = _on_msg

def _start_mqtt():
    global mqtt_active
    try:
        print(f"[INFO] Connecting to MQTT Broker at {_mq_host}:{_mq_port}...")
        _mc.connect(_mq_host, _mq_port, 60)
        mqtt_active = True
        _mc.loop_forever()
    except Exception as e:
        print(f"[WARNING] MQTT connection failed: {e}. IoT real-time updates disabled.")

threading.Thread(target=_start_mqtt, daemon=True).start()

# --- Pydantic Schemas ---
class _SensorPayload(BaseModel):
    m: float
    t: float
    h: float
    pump: Optional[bool] = None

class _PumpCmd(BaseModel):
    state: bool

class ChatRequest(BaseModel):
    message: str

# --- In-Memory Local Database Fallbacks ---
_local_history = [
    { "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 3600*i)), "m": 50 + (i%3)*4, "t": 24 + (i%5)*2, "h": 70 - (i%4)*3, "pump": False }
    for i in range(10, 0, -1)
]

# --- API Routes ---

@app.get("/api/telemetry")
async def get_telemetry():
    """Returns the current real-time telemetry state"""
    # Fetch from Firebase if active
    if firebase_active:
        try:
            snap = db.reference("/state").get()
            if snap:
                return {
                    "temperature": snap.get("t", 30.5),
                    "humidity": snap.get("h", 65.3),
                    "soil_moisture": snap.get("m", 51.8),
                    "pump_status": "ON" if snap.get("pump", False) else "OFF",
                    "water_level": 79.5,
                    "last_sync": snap.get("ts", "Just Now")
                }
        except Exception as e:
            print(f"[ERROR] Failed to fetch telemetry from Firebase: {e}")
            
    # Fallback to local _live state
    return {
        "temperature": _live.get("t", 30.5),
        "humidity": _live.get("h", 65.3),
        "soil_moisture": _live.get("m", 51.8),
        "pump_status": "ON" if _live.get("pump", False) else "OFF",
        "water_level": 79.5,
        "last_sync": _live.get("ts", "Just Now")
    }

@app.post("/api/telemetry/update")
async def update_telemetry(payload: _SensorPayload):
    """Allows updating telemetry directly via POST request (HTTP fallback for ESP32)"""
    global _live
    _live["t"] = payload.t
    _live["h"] = payload.h
    _live["m"] = payload.m
    if payload.pump is not None:
        _live["pump"] = payload.pump
    _live["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Save to Firebase if active
    if firebase_active:
        try:
            db.reference("/state").set(_live)
            timestamp_key = _live["ts"].replace(".", "_").replace(":", "_").replace("-", "_")
            db.reference(f"/history/{timestamp_key}").set(_live)
        except Exception as e:
            print(f"[ERROR] Firebase save failed in update endpoint: {e}")
    else:
        # Save to local history
        _local_history.append(_live.copy())
        if len(_local_history) > 50:
            _local_history.pop(0)
            
    return {"status": "success", "data": _live}

@app.get("/api/history")
async def get_history(limit: int = 24):
    """Returns the historical telemetry data and hourly trends"""
    history_list = []
    trends_list = []
    
    if firebase_active:
        try:
            ref = db.reference("/history")
            snap = ref.order_by_key().limit_to_last(limit).get()
            if snap:
                sorted_keys = sorted(snap.keys())
                for k in sorted_keys:
                    item = snap[k]
                    m = item.get("m", 50.0)
                    t = item.get("t", 25.0)
                    h = item.get("h", 50.0)
                    pump = item.get("pump", False)
                    ts = item.get("ts", "")
                    
                    time_str = "00:00"
                    if ts and "T" in ts:
                        time_str = ts.split("T")[1][:5]
                        
                    # Format to 12 hour AM/PM format
                    try:
                        h_val = int(time_str.split(":")[0])
                        m_val = time_str.split(":")[1]
                        ampm = "AM" if h_val < 12 else "PM"
                        h_12 = h_val % 12
                        if h_12 == 0:
                            h_12 = 12
                        history_time = f"{h_12:02d}:{m_val} {ampm}"
                    except:
                        history_time = time_str
                        
                    history_list.append({
                        "time": history_time,
                        "temp": t,
                        "humidity": h,
                        "moisture": m,
                        "pump": "ON" if pump else "OFF"
                    })
                    
                    trends_list.append({
                        "time": time_str,
                        "temp": t,
                        "humidity": h,
                        "moisture": m
                    })
        except Exception as e:
            print(f"[ERROR] Failed to fetch history from Firebase: {e}")

    # Fallback to local history
    if not history_list:
        for item in _local_history:
            ts = item.get("ts", "")
            time_str = ts.split("T")[1][:5] if "T" in ts else "00:00"
            history_list.append({
                "time": f"{time_str} PM" if int(time_str.split(":")[0]) >= 12 else f"{time_str} AM",
                "temp": item.get("t"),
                "humidity": item.get("h"),
                "moisture": item.get("m"),
                "pump": "ON" if item.get("pump") else "OFF"
            })
            trends_list.append({
                "time": time_str,
                "temp": item.get("t"),
                "humidity": item.get("h"),
                "moisture": item.get("m")
            })

    # Return structure matching React App.jsx expectations
    return {
        "history": history_list if history_list else [
            { "time": "06:00 AM", "temp": 24.6, "humidity": 78.2, "moisture": 68.5, "pump": "OFF" },
            { "time": "08:00 AM", "temp": 27.1, "humidity": 72.8, "moisture": 61.2, "pump": "OFF" },
            { "time": "10:00 AM", "temp": 30.4, "humidity": 66.5, "moisture": 52.7, "pump": "OFF" },
            { "time": "12:00 PM", "temp": 33.8, "humidity": 58.4, "moisture": 41.8, "pump": "ON" },
            { "time": "02:00 PM", "temp": 35.1, "humidity": 54.7, "moisture": 37.2, "pump": "ON" },
            { "time": "04:00 PM", "temp": 32.2, "humidity": 60.9, "moisture": 49.6, "pump": "OFF" }
        ],
        "trends": trends_list if trends_list else [
            { "time": "06:00", "temp": 24.6, "humidity": 78.2, "moisture": 68.5 },
            { "time": "09:00", "temp": 28.5, "humidity": 70.1, "moisture": 58.3 },
            { "time": "12:00", "temp": 33.8, "humidity": 58.4, "moisture": 41.8 },
            { "time": "15:00", "temp": 35.1, "humidity": 54.7, "moisture": 37.2 },
            { "time": "18:00", "temp": 31.0, "humidity": 62.4, "moisture": 50.1 },
            { "time": "21:00", "temp": 27.3, "humidity": 71.2, "moisture": 53.5 }
        ]
    }

@app.get("/api/crop-recommendations")
async def get_crop_recommendations():
    """Returns static and dynamic crop recommendations"""
    # Suitability indices matching mockup text exactly
    return [
        { "id": "banana", "name": "Banana", "suitability": 99, "potential": "High Yield Potential", "season": "Year-round", "est_yield": "35-40 tons/acre", "image": "🍌" },
        { "id": "tea", "name": "Tea", "suitability": 95, "potential": "High Yield Potential", "season": "Perennial", "est_yield": "2.5-3.5 tons/acre", "image": "🌱" },
        { "id": "turmeric", "name": "Turmeric", "suitability": 92, "potential": "Good Potential", "season": "June - March", "est_yield": "8-10 tons/acre", "image": "🍠" },
        { "id": "ginger", "name": "Ginger", "suitability": 90, "potential": "Good Potential", "season": "May - Feb", "est_yield": "6-8 tons/acre", "image": "🥔" }
    ]

@app.get("/api/soil-health")
async def get_soil_health():
    """Returns soil health metrics"""
    return {
        "overall_score": 85,
        "details": [
            { "metric": "pH Level", "value": "6.8", "status": "Optimal" },
            { "metric": "Organic Matter", "value": "2.3%", "status": "Good" },
            { "metric": "Nitrogen (N)", "value": "45 ppm", "status": "Good" },
            { "metric": "Phosphorus (P)", "value": "32 ppm", "status": "Medium" },
            { "metric": "Potassium (K)", "value": "280 ppm", "status": "Good" }
        ]
    }

@app.get("/api/alerts")
async def get_alerts():
    """Dynamically compiles system warnings and notifications based on current telemetry"""
    m = _live.get("m", 51.8)
    t = _live.get("t", 30.5)
    pump = _live.get("pump", False)
    
    alerts = []
    # Dynamic active alerts
    if pump:
        alerts.append({ "id": 1, "title": "Irrigation Activated", "desc": "Water pump is currently running", "time": "Just now", "type": "pump_on" })
    else:
        alerts.append({ "id": 1, "title": "Soil Moisture Optimal", "desc": "Soil moisture levels are within optimal range", "time": "15 min ago", "type": "status" })
        
    if m < 20.0:
        alerts.append({ "id": 2, "title": "Critically Dry Soil", "desc": f"Critically low moisture level ({m:.1f}%) detected", "time": "2 min ago", "type": "critical" })
    elif m < 45.0:
        alerts.append({ "id": 2, "title": "Low Soil Moisture", "desc": f"Moisture level is dry ({m:.1f}%)", "time": "5 min ago", "type": "warning" })
        
    if t > 38.0:
        alerts.append({ "id": 3, "title": "Extreme Heat Alert", "desc": f"Ambient temperature is high ({t:.1f}°C)", "time": "8 min ago", "type": "critical" })
        
    # Weather notification
    alerts.append({ "id": 4, "title": "Clear Sky outlook", "desc": "Good solar charging weather for the next 48h", "time": "1 hour ago", "type": "weather" })
    
    return alerts

@app.post("/api/pump/toggle")
async def api_pump_toggle():
    """Toggles pump state and syncs to ESP32 over MQTT and Firebase"""
    global _live
    current_state = _live.get("pump", False)
    
    # Try fetching from Firebase first to stay in sync
    if firebase_active:
        try:
            ref = db.reference("/state/pump")
            snap = ref.get()
            if snap is not None:
                current_state = bool(snap)
        except Exception as e:
            print(f"[WARNING] Firebase pump read failed: {e}")

    new_state = not current_state
    
    # Update local memory
    _live["pump"] = new_state
    _live["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Sync with Firebase
    if firebase_active:
        try:
            db.reference("/state/pump").set(new_state)
            db.reference("/state/ts").set(_live["ts"])
        except Exception as e:
            print(f"[ERROR] Failed to save pump state to Firebase: {e}")
            
    # Sync with MQTT (Command to ESP32)
    if mqtt_active:
        try:
            payload = json.dumps({"pump": new_state})
            info = _mc.publish(_mq_topic_pump, payload, qos=1)
            info.wait_for_publish(timeout=2)
            print(f"[MQTT] Published pump toggle cmd -> {new_state}")
        except Exception as e:
            print(f"[ERROR] Failed to publish pump toggle to MQTT: {e}")
            
    return {"published": mqtt_active, "pump_status": "ON" if new_state else "OFF"}

@app.post("/api/chat")
async def chat_bot(req: ChatRequest):
    """Integrates Gemini AI assistant Shakti for smart farming questions"""
    user_msg = req.message
    
    # Context injected from real-time sensors
    m = _live.get("m", 51.8)
    t = _live.get("t", 30.5)
    h = _live.get("h", 65.3)
    pump = "ON" if _live.get("pump", False) else "OFF"
    
    prompt = (
        f"You are Shakti, an intelligent smart agricultural assistant for the 'Neuro VP Dhara Core' smart irrigation system in Hoskote.\n"
        f"Current system readings:\n"
        f"- Soil Moisture: {m:.1f}%\n"
        f"- Temperature: {t:.1f}°C\n"
        f"- Relative Humidity: {h:.1f}%\n"
        f"- Water Pump Status: {pump}\n\n"
        f"The farmer asks you this question: \"{user_msg}\"\n\n"
        f"Provide a helpful, polite, and farmer-focused answer. Keep the answer direct and concise (3-4 sentences maximum)."
    )
    
    if gemini_active:
        try:
            res = _gem.generate_content(prompt)
            return {"response": res.text}
        except Exception as e:
            print(f"[ERROR] Gemini generation failed: {e}")
            
    # Fallback response generator (heuristics)
    msg_lower = user_msg.lower()
    if "moisture" in msg_lower or "water" in msg_lower or "pump" in msg_lower:
        response = f"Your current soil moisture is {m:.1f}%, which is in the optimal range. The pump is currently {pump}. If the moisture falls below 45%, the automatic override will switch the pump ON."
    elif "crop" in msg_lower or "plant" in msg_lower or "banana" in msg_lower:
        response = f"With your current warm climate ({t:.1f}°C) and moderate moisture, crops like Banana and Tea are highly suitable. Banana has a 99% suitability rating on your soil today."
    elif "temp" in msg_lower or "weather" in msg_lower:
        response = f"The current ambient temperature in the field is {t:.1f}°C with relative humidity at {h:.1f}%. It is perfect for solar irrigation charging, and no dry spell warnings are active."
    else:
        response = f"Hello! As your SmartRoots assistant Shakti, I'm monitoring the Hoskote field. Current readings: Soil Moisture {m:.1f}%, Temperature {t:.1f}°C. Let me know how I can assist you with irrigation schedules or crops!"
        
    return {"response": response}

# --- Legacy Backend API Support ---
@app.post("/api/recommend")
async def recommend(p: _SensorPayload):
    """Requests recommendations using Gemini directly (for backward compatibility)"""
    prompt = (
        f"You are an agricultural AI advisor for a small-scale IoT smart irrigation system called Neuro VP Dhara Core.\n"
        f"Current sensor readings:\n"
        f"- Soil Moisture: {p.m:.1f}%\n"
        f"- Ambient Temperature: {p.t:.1f}°C\n"
        f"- Relative Humidity: {p.h:.1f}%\n"
        f"- Water Pump Status: {'ON' if p.pump else 'OFF'}\n\n"
        f"Based on these readings, provide a concise, structured response with the following sections:\n"
        f"1. Soil Health Assessment\n"
        f"2. Irrigation Recommendation (next 24 hours)\n"
        f"3. Crop Risk Alerts (if any)\n"
        f"4. Optimal Next Watering Window\n"
        f"Keep the response practical and farmer-friendly."
    )
    if gemini_active:
        try:
            res = _gem.generate_content(prompt)
            return {"advice": res.text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    # Mock fallback recommendations
    advice = (
        "### 1. Soil Health Assessment\n"
        f"Soil moisture is stable at {p.m:.1f}%, which is healthy. Soil pH is around 6.8 (Optimal).\n\n"
        "### 2. Irrigation Recommendation\n"
        "No irrigation needed for the next 24 hours as soil moisture is above the threshold.\n\n"
        "### 3. Crop Risk Alerts\n"
        "No immediate disease or stress risks are detected.\n\n"
        "### 4. Optimal Next Watering Window\n"
        "Early morning tomorrow (approx 06:00 AM) if moisture levels descend below 45%."
    )
    return {"advice": advice}

# Serve React frontend static files
frontend_dist_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist_path):
    print(f"[INFO] Mounting static assets from: {frontend_dist_path}")
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        index_file = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Index file not found")

    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        # Prevent intercepting API routes
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        index_file = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Index file not found")
else:
    print("[WARNING] Frontend build folder 'frontend/dist' not found. API server will run without serving frontend.")

if __name__ == "__main__":
    # Start the server on port 8000
    print("[INFO] Starting FastAPI backend on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
