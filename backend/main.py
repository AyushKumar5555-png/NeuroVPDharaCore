from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
from typing import List, Optional

app = FastAPI(title="Neuro VP Dhara Core API")

# Enable CORS for the frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database representing current system state
class TelemetryState(BaseModel):
    temperature: float = 30.5
    humidity: float = 65.3
    soil_moisture: float = 51.8
    pump_status: str = "OFF"
    water_level: float = 79.5
    last_sync: str = "Just Now"

class TelemetryUpdate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    pump_status: Optional[str] = None
    water_level: Optional[float] = None

current_telemetry = TelemetryState()

# In-memory history matching the report and mockup data
history_data = [
    {"time": "06:00 AM", "temp": 24.6, "humidity": 78.2, "moisture": 68.5, "pump": "OFF"},
    {"time": "08:00 AM", "temp": 27.1, "humidity": 72.8, "moisture": 61.2, "pump": "OFF"},
    {"time": "10:00 AM", "temp": 30.4, "humidity": 66.5, "moisture": 52.7, "pump": "OFF"},
    {"time": "12:00 PM", "temp": 33.8, "humidity": 58.4, "moisture": 41.8, "pump": "ON"},
    {"time": "02:00 PM", "temp": 35.1, "humidity": 54.7, "moisture": 37.2, "pump": "ON"},
    {"time": "04:00 PM", "temp": 32.2, "humidity": 60.9, "moisture": 49.6, "pump": "OFF"},
]

# Trend chart data (24 Hours)
trend_data = [
    {"time": "06:00", "temp": 24.6, "humidity": 78.2, "moisture": 68.5},
    {"time": "09:00", "temp": 28.5, "humidity": 70.1, "moisture": 58.3},
    {"time": "12:00", "temp": 33.8, "humidity": 58.4, "moisture": 41.8},
    {"time": "15:00", "temp": 35.1, "humidity": 54.7, "moisture": 37.2},
    {"time": "18:00", "temp": 31.0, "humidity": 62.4, "moisture": 50.1},
    {"time": "21:00", "temp": 27.3, "humidity": 71.2, "moisture": 53.5},
    {"time": "00:00", "temp": 25.1, "humidity": 75.9, "moisture": 54.8},
    {"time": "03:00", "temp": 24.0, "humidity": 77.5, "moisture": 52.3},
    {"time": "06:00", "temp": 24.6, "humidity": 78.2, "moisture": 51.8},
]

# Recommended crops list matching mockup
crops_data = [
    {
        "id": "banana",
        "name": "Banana",
        "suitability": 99,
        "potential": "High Yield Potential",
        "season": "Year-round",
        "est_yield": "35-40 tons/acre",
        "image": "🍌"
    },
    {
        "id": "tea",
        "name": "Tea",
        "suitability": 95,
        "potential": "High Yield Potential",
        "season": "Perennial",
        "est_yield": "2.5-3.5 tons/acre",
        "image": "🌱"
    },
    {
        "id": "turmeric",
        "name": "Turmeric",
        "suitability": 92,
        "potential": "Good Potential",
        "season": "June - March",
        "est_yield": "8-10 tons/acre",
        "image": "🍠"
    },
    {
        "id": "ginger",
        "name": "Ginger",
        "suitability": 90,
        "potential": "Good Potential",
        "season": "May - Feb",
        "est_yield": "6-8 tons/acre",
        "image": "🥔"
    }
]

# Soil Health details matching mockup
soil_health_data = {
    "overall_score": 85,
    "details": [
        {"metric": "pH Level", "value": "6.8", "status": "Optimal"},
        {"metric": "Organic Matter", "value": "2.3%", "status": "Good"},
        {"metric": "Nitrogen (N)", "value": "45 ppm", "status": "Good"},
        {"metric": "Phosphorus (P)", "value": "32 ppm", "status": "Medium"},
        {"metric": "Potassium (K)", "value": "280 ppm", "status": "Good"},
    ]
}

# Alerts list matching mockup
alerts_data = [
    {"id": 1, "title": "Irrigation Activated", "desc": "Irrigation system started automatically", "time": "2 min ago", "type": "pump_on"},
    {"id": 2, "title": "Soil Moisture Optimal", "desc": "Soil moisture levels are within optimal range", "time": "15 min ago", "type": "status"},
    {"id": 3, "title": "Weather Alert", "desc": "Clear weather expected for next 3 days", "time": "1 hour ago", "type": "weather"}
]

# Chat message model
class ChatMessage(BaseModel):
    message: str

# Endpoints
@app.get("/api/telemetry", response_model=TelemetryState)
def get_telemetry():
    return current_telemetry

@app.post("/api/telemetry/update")
def update_telemetry(update: TelemetryUpdate):
    global current_telemetry
    if update.temperature is not None:
        current_telemetry.temperature = update.temperature
    if update.humidity is not None:
        current_telemetry.humidity = update.humidity
    if update.soil_moisture is not None:
        current_telemetry.soil_moisture = update.soil_moisture
        # Auto trigger pump based on threshold (e.g. if below 40% turns ON, if above 60% turns OFF)
        if current_telemetry.soil_moisture < 40.0:
            current_telemetry.pump_status = "ON"
        elif current_telemetry.soil_moisture > 60.0:
            current_telemetry.pump_status = "OFF"
    if update.pump_status is not None:
        current_telemetry.pump_status = update.pump_status
    if update.water_level is not None:
        current_telemetry.water_level = update.water_level
    
    current_telemetry.last_sync = "Just Now"
    return {"status": "success", "data": current_telemetry}

@app.get("/api/history")
def get_history():
    return {
        "history": history_data,
        "trends": trend_data
    }

@app.get("/api/crop-recommendations")
def get_crops():
    return crops_data

@app.get("/api/soil-health")
def get_soil_health():
    return soil_health_data

@app.get("/api/alerts")
def get_alerts():
    return alerts_data

@app.post("/api/pump/toggle")
def toggle_pump():
    global current_telemetry
    if current_telemetry.pump_status == "ON":
        current_telemetry.pump_status = "OFF"
    else:
        current_telemetry.pump_status = "ON"
    return {"status": "success", "pump_status": current_telemetry.pump_status}

@app.post("/api/chat")
async def chat_bot(chat_msg: ChatMessage):
    user_query = chat_msg.message
    
    # Check if Google Gemini API key is available
    api_key = os.environ.get("GEMINI_API_KEY")
    
    # Prompt engineering with context of current telemetry
    prompt = f"""
    You are Shakti, the AI Smart Farming Assistant for the project "Neuro VP Dhara Core" (SmartRoots).
    
    Current Farm Data:
    - Temperature: {current_telemetry.temperature}°C
    - Humidity: {current_telemetry.humidity}%
    - Soil Moisture: {current_telemetry.soil_moisture}%
    - Pump Status: {current_telemetry.pump_status}
    - Water Level: {current_telemetry.water_level}%
    
    The user is asking: "{user_query}"
    Provide a concise, helpful, and expert response tailored to this smart agriculture system. Keep it under 4 sentences if possible.
    """
    
    if api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    response_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {"response": response_text.strip()}
        except Exception as e:
            # Fallback to local response on exception
            pass

    # Heuristic fallback responses based on keywords
    query_lower = user_query.lower()
    if "pump" in query_lower or "irrigation" in query_lower:
        if current_telemetry.soil_moisture < 45.0:
            msg = f"The current soil moisture is low ({current_telemetry.soil_moisture}%). The irrigation system is active and the pump is ON to restore optimal moisture."
        else:
            msg = f"Soil moisture is currently at {current_telemetry.soil_moisture}%, which is sufficient. The pump is OFF. I will monitor it and trigger irrigation if it drops below 40%."
    elif "moisture" in query_lower or "water" in query_lower:
        msg = f"Soil moisture is at {current_telemetry.soil_moisture}%. For red loamy soil, maintaining moisture between 45% and 60% is ideal for your Paddy crop."
    elif "crop" in query_lower or "banana" in query_lower or "tea" in query_lower:
        msg = "Based on Hoskote's red loamy soil and climate parameters, Banana (99% suitability) and Tea (95% suitability) are highly recommended. Turmeric and Ginger are also excellent choices."
    elif "weather" in query_lower or "temperature" in query_lower:
        msg = f"Current temp is {current_telemetry.temperature}°C with {current_telemetry.humidity}% humidity. Clear weather is expected for the next 3 days, which is favorable for Paddy development."
    else:
        msg = f"I am monitoring your farm in Hoskote. Current parameters: Temp {current_telemetry.temperature}°C, Moisture {current_telemetry.soil_moisture}%, and Pump is {current_telemetry.pump_status}. Let me know if you need to adjust irrigation or want crop recommendations."

    return {"response": msg}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
