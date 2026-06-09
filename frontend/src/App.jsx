import React, { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Droplet, 
  Sprout, 
  Activity, 
  Bell, 
  Settings, 
  Compass, 
  BookOpen, 
  ShoppingBag, 
  CheckCircle2, 
  Wifi, 
  User, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  MessageSquare,
  AlertTriangle,
  Send,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const BASE_URL = window.location.port === '5173' ? 'http://localhost:8000' : '';

  // Telemetry States
  const [telemetry, setTelemetry] = useState({
    temperature: 30.5,
    humidity: 65.3,
    soil_moisture: 51.8,
    pump_status: 'OFF',
    water_level: 79.5,
    last_sync: 'Just Now'
  });

  // History & Trends
  const [history, setHistory] = useState([]);
  const [trends, setTrends] = useState([]);
  const [crops, setCrops] = useState([]);
  const [soilHealth, setSoilHealth] = useState({ overall_score: 85, details: [] });
  const [alerts, setAlerts] = useState([]);
  
  // Interactive Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am Shakti, your AI Smart Farming Assistant. How can I help you manage your farm in Hoskote today?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch data from FastAPI backend
  const fetchData = async () => {
    try {
      const telRes = await fetch(`${BASE_URL}/api/telemetry`);
      if (telRes.ok) {
        const data = await telRes.json();
        setTelemetry(data);
      }
      
      const histRes = await fetch(`${BASE_URL}/api/history`);
      if (histRes.ok) {
        const data = await histRes.json();
        setHistory(data.history || []);
        setTrends(data.trends || []);
      }

      const cropsRes = await fetch(`${BASE_URL}/api/crop-recommendations`);
      if (cropsRes.ok) {
        const data = await cropsRes.json();
        setCrops(data);
      }

      const soilRes = await fetch(`${BASE_URL}/api/soil-health`);
      if (soilRes.ok) {
        const data = await soilRes.json();
        setSoilHealth(data);
      }

      const alertRes = await fetch(`${BASE_URL}/api/alerts`);
      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlerts(data);
      }
    } catch (err) {
      console.warn("Backend connection failed, running on mock data mode.", err);
      // Fallback/Mock Data mode (matching image.png and image copy 2.png)
      setTelemetry(prev => ({
        ...prev,
        // If user interacted, preserve state, otherwise use mockup defaults
        temperature: prev.temperature !== 30.5 ? prev.temperature : 30.5,
        humidity: prev.humidity !== 65.3 ? prev.humidity : 65.3,
        soil_moisture: prev.soil_moisture !== 51.8 ? prev.soil_moisture : 51.8,
        pump_status: prev.pump_status,
        water_level: 79.5
      }));
      
      setHistory([
        { time: "06:00 AM", temp: 24.6, humidity: 78.2, moisture: 68.5, pump: "OFF" },
        { time: "08:00 AM", temp: 27.1, humidity: 72.8, moisture: 61.2, pump: "OFF" },
        { time: "10:00 AM", temp: 30.4, humidity: 66.5, moisture: 52.7, pump: "OFF" },
        { time: "12:00 PM", temp: 33.8, humidity: 58.4, moisture: 41.8, pump: "ON" },
        { time: "02:00 PM", temp: 35.1, humidity: 54.7, moisture: 37.2, pump: "ON" },
        { time: "04:00 PM", temp: 32.2, humidity: 60.9, moisture: 49.6, pump: "OFF" }
      ]);

      setTrends([
        { time: "06:00", temp: 24.6, humidity: 78.2, moisture: 68.5 },
        { time: "09:00", temp: 28.5, humidity: 70.1, moisture: 58.3 },
        { time: "12:00", temp: 33.8, humidity: 58.4, moisture: 41.8 },
        { time: "15:00", temp: 35.1, humidity: 54.7, moisture: 37.2 },
        { time: "18:00", temp: 31.0, humidity: 62.4, moisture: 50.1 },
        { time: "21:00", temp: 27.3, humidity: 71.2, moisture: 53.5 },
        { time: "00:00", temp: 25.1, humidity: 75.9, moisture: 54.8 },
        { time: "03:00", temp: 24.0, humidity: 77.5, moisture: 52.3 },
        { time: "06:00", temp: 24.6, humidity: 78.2, moisture: 51.8 }
      ]);

      setCrops([
        { id: "banana", name: "Banana", suitability: 99, potential: "High Yield Potential", season: "Year-round", est_yield: "35-40 tons/acre", image: "🍌" },
        { id: "tea", name: "Tea", suitability: 95, potential: "High Yield Potential", season: "Perennial", est_yield: "2.5-3.5 tons/acre", image: "🌱" },
        { id: "turmeric", name: "Turmeric", suitability: 92, potential: "Good Potential", season: "June - March", est_yield: "8-10 tons/acre", image: "🍠" },
        { id: "ginger", name: "Ginger", suitability: 90, potential: "Good Potential", season: "May - Feb", est_yield: "6-8 tons/acre", image: "🥔" }
      ]);

      setSoilHealth({
        overall_score: 85,
        details: [
          { metric: "pH Level", value: "6.8", status: "Optimal" },
          { metric: "Organic Matter", value: "2.3%", status: "Good" },
          { metric: "Nitrogen (N)", value: "45 ppm", status: "Good" },
          { metric: "Phosphorus (P)", value: "32 ppm", status: "Medium" },
          { metric: "Potassium (K)", value: "280 ppm", status: "Good" }
        ]
      });

      setAlerts([
        { id: 1, title: "Irrigation Activated", desc: "Irrigation system started automatically", time: "2 min ago", type: "pump_on" },
        { id: 2, title: "Soil Moisture Optimal", desc: "Soil moisture levels are within optimal range", time: "15 min ago", type: "status" },
        { id: 3, title: "Weather Alert", desc: "Clear weather expected for next 3 days", time: "1 hour ago", type: "weather" }
      ]);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Trigger pump toggling via API
  const handlePumpToggle = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/pump/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTelemetry(prev => ({ ...prev, pump_status: data.pump_status }));
      }
    } catch (err) {
      // Offline fallback toggle
      setTelemetry(prev => ({
        ...prev,
        pump_status: prev.pump_status === 'ON' ? 'OFF' : 'ON'
      }));
    }
  };

  // Send message to chatbot endpoint
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
      } else {
        throw new Error();
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "I'm having trouble connecting to my central brain. Please check if the FastAPI server is running!" 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-[#e0f2f1]" style={{ backgroundColor: '#060e12', fontFamily: "'Inter', sans-serif" }}>
      {/* 3D Glassy Gloss SVG Filters */}
      <svg className="hidden">
        <defs>
          <filter id="glossy-bevel" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
            <feSpecularLighting in="blur" surfaceScale="5" specularConstant="0.75" specularExponent="20" lighting-color="#ffffff" result="light">
              <feDistantLight azimuth="225" elevation="60"/>
            </feSpecularLighting>
            <feComposite in="light" in2="SourceAlpha" operator="in" result="lightHighlight"/>
            <feBlend in="SourceGraphic" in2="lightHighlight" mode="screen"/>
          </filter>
        </defs>
      </svg>

      {/* Header Panel */}
      <header className="glossy-panel p-4 mb-4 flex items-center justify-between border border-[rgba(255,255,255,0.05)] rounded-xl" style={{ boxShadow: 'var(--shadow-3d)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[rgba(0,230,118,0.15)] rounded-lg border border-[rgba(0,230,118,0.3)]">
            <Sprout className="w-6 h-6 text-[#00e676]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>NEURO VP DHAR CORE</h1>
            <p className="text-xs text-[#80cbc4]">Smart Irrigation & Farming Assistant</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#09151b] p-1 rounded-full border border-[rgba(255,255,255,0.03)]">
          {['Dashboard', 'Analytics', 'Research', 'Recommendations', 'Market', 'Settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab 
                  ? 'bg-[rgba(0,230,118,0.2)] text-[#00e676] border border-[rgba(0,230,118,0.3)] shadow-[0_0_10px_rgba(0,230,118,0.25)]' 
                  : 'text-[#80cbc4] hover:text-[#e0f2f1]'
              }`}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Farmer Status Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-[#80cbc4]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] pulse-active"></span>
            <span>Good Evening, Farmer</span>
          </div>
          <button className="relative p-2 bg-[#0d1c24] hover:bg-[#122732] rounded-full border border-[rgba(255,255,255,0.05)] transition-all">
            <Bell className="w-4 h-4 text-[#80cbc4]" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Main Grid Container */}
      <div className="dashboard-grid">
        
        {/* Left Sidebar */}
        <aside className="flex flex-col gap-4">
          
          {/* Farm Location Card */}
          <div className="glossy-panel p-4 flex flex-col gap-3">
            <h3 className="text-xs text-[#4db6ac] uppercase tracking-wider font-semibold">📍 Farm Location</h3>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-[#e0f2f1]">Bengaluru, Karnataka</span>
              <div className="grid grid-cols-2 gap-y-1 text-xs text-[#80cbc4]">
                <span>Lat: 12.9716° N</span>
                <span>Long: 77.5946° E</span>
                <span>Elevation: 300m</span>
                <span>Terrain: Plateau</span>
              </div>
            </div>
          </div>

          {/* Live Weather Card */}
          <div className="glossy-panel p-4 flex flex-col gap-3">
            <h3 className="text-xs text-[#4db6ac] uppercase tracking-wider font-semibold">☀️ Live Weather</h3>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-bold font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>{telemetry.temperature}<span className="text-lg font-normal">°C</span></span>
                <p className="text-xs text-[#80cbc4] mt-0.5">Clear Sky</p>
              </div>
              <div className="flex flex-col text-right text-xs text-[#80cbc4] gap-1">
                <span>💧 Humidity: {telemetry.humidity}%</span>
                <span>💨 Wind Speed: 6.8 km/h</span>
              </div>
            </div>
          </div>

          {/* System Check Card */}
          <div className="glossy-panel p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[#00e676]">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">All Systems Normal</span>
            </div>
            <p className="text-xs text-[#80cbc4]">
              {telemetry.pump_status === 'ON' 
                ? 'Irrigation pump is ON and watering.' 
                : 'Irrigation pump is OFF. No actions required at this time.'}
            </p>
          </div>

          {/* System Status Table Panel */}
          <div className="glossy-panel p-4 flex flex-col gap-3">
            <h3 className="text-xs text-[#4db6ac] uppercase tracking-wider font-semibold">⚙️ System Status</h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between border-b border-[rgba(255,255,255,0.03)] pb-1.5">
                <span className="text-[#80cbc4]">Sensors</span>
                <span className="text-[#00e676] font-semibold">Online</span>
              </div>
              <div className="flex justify-between border-b border-[rgba(255,255,255,0.03)] pb-1.5">
                <span className="text-[#80cbc4]">Irrigation System</span>
                <span className={`${telemetry.pump_status === 'ON' ? 'text-[#00e676]' : 'text-[#80cbc4]'} font-semibold`}>
                  {telemetry.pump_status === 'ON' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[rgba(255,255,255,0.03)] pb-1.5">
                <span className="text-[#80cbc4]">Data Connection</span>
                <span className="text-[#00e676] font-semibold">Strong</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#80cbc4]">Last Sync</span>
                <span className="text-[#80cbc4] font-medium">{telemetry.last_sync}</span>
              </div>
            </div>
          </div>

          {/* Chat / Assistant Helper */}
          <div className="glossy-panel p-4 flex flex-col gap-3 mt-auto bg-gradient-to-br from-[#0c2b29] to-[#0a151b] border-l-2 border-[#00e676]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00e676]" />
              <span className="text-xs font-bold text-[#e0f2f1]">Need Help?</span>
            </div>
            <p className="text-xs text-[#80cbc4]">Ask Agri Assistant. Get instant farming advice.</p>
            <button 
              onClick={() => setChatOpen(true)}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat Now
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          
          {activeTab === 'Dashboard' && (
            <>
              {/* Telemetry Row Cards (5 cards) */}
              <div className="telemetry-row">
                
                {/* Card 1: Temp */}
                <div className="glossy-panel p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#80cbc4] font-semibold">Temperature</span>
                    <Thermometer className="w-5 h-5 text-[#ff9100]" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {telemetry.temperature}
                    </span>
                    <span className="text-sm text-[#80cbc4]">°C</span>
                  </div>
                  <span className="text-[10px] text-[#00e676] bg-[rgba(0,230,118,0.08)] py-0.5 px-2 rounded-full self-start">Normal</span>
                </div>

                {/* Card 2: Humidity */}
                <div className="glossy-panel p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#80cbc4] font-semibold">Humidity</span>
                    <Droplet className="w-5 h-5 text-[#00e5ff]" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {telemetry.humidity}
                    </span>
                    <span className="text-sm text-[#80cbc4]">%</span>
                  </div>
                  <span className="text-[10px] text-[#00e676] bg-[rgba(0,230,118,0.08)] py-0.5 px-2 rounded-full self-start">Normal</span>
                </div>

                {/* Card 3: Moisture */}
                <div className="glossy-panel p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#80cbc4] font-semibold">Soil Moisture</span>
                    <Sprout className="w-5 h-5 text-[#00e676]" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {telemetry.soil_moisture}
                    </span>
                    <span className="text-sm text-[#80cbc4]">%</span>
                  </div>
                  <span className={`text-[10px] py-0.5 px-2 rounded-full self-start ${telemetry.soil_moisture < 45 ? 'text-red-400 bg-[rgba(239,83,80,0.08)]' : 'text-[#00e676] bg-[rgba(0,230,118,0.08)]'}`}>
                    {telemetry.soil_moisture < 45 ? 'Dry soil' : 'Normal'}
                  </span>
                </div>

                {/* Card 4: Water Level */}
                <div className="glossy-panel p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#80cbc4] font-semibold">Water Level</span>
                    <Activity className="w-5 h-5 text-[#29b6f6]" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {telemetry.water_level}
                    </span>
                    <span className="text-sm text-[#80cbc4]">%</span>
                  </div>
                  <span className="text-[10px] text-[#00e676] bg-[rgba(0,230,118,0.08)] py-0.5 px-2 rounded-full self-start">Sufficient</span>
                </div>

                {/* Card 5: Pump Status */}
                <div className={`glossy-panel p-4 flex flex-col gap-2 border transition-all duration-300 ${telemetry.pump_status === 'ON' ? 'border-[#00e676] bg-[rgba(0,230,118,0.03)]' : 'border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#80cbc4] font-semibold font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Water Pump</span>
                    <div className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${telemetry.pump_status === 'ON' ? 'bg-[#00e676]' : 'bg-[#e0f2f1]'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${telemetry.pump_status === 'ON' ? 'bg-[#00e676]' : 'bg-[#80cbc4]'}`}></span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-2xl font-extrabold tracking-wide ${telemetry.pump_status === 'ON' ? 'text-[#00e676] text-glow' : 'text-[#80cbc4]'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {telemetry.pump_status}
                    </span>
                  </div>
                  <button 
                    onClick={handlePumpToggle}
                    className={`text-[8.5px] font-bold uppercase tracking-wider py-0.5 px-2 rounded mt-0.5 self-start transition-all border ${
                      telemetry.pump_status === 'ON' 
                        ? 'bg-[rgba(239,83,80,0.1)] text-red-400 border-[rgba(239,83,80,0.2)] hover:bg-red-400 hover:text-[#060e12]' 
                        : 'bg-[rgba(0,230,118,0.1)] text-[#00e676] border-[rgba(0,230,118,0.2)] hover:bg-[#00e676] hover:text-[#060e12]'
                    }`}
                  >
                    {telemetry.pump_status === 'ON' ? 'Turn OFF' : 'Turn ON'}
                  </button>
                </div>

              </div>

              {/* Row 2: Sensors trend & history */}
              <div className="trend-history-row">
                
                {/* 24 hour trend line chart */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    📈 24-Hour Sensor Readings Trend
                  </h3>
                  
                  <div className="w-full flex-1 min-h-[200px] md:min-h-[220px]" style={{ height: '220px' }}>
                    <ResponsiveContainer width="99%" height={220}>
                      <LineChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="time" stroke="#80cbc4" style={{ fontSize: '9px', fontWeight: '500' }} />
                        <YAxis stroke="#80cbc4" style={{ fontSize: '9px', fontWeight: '500' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#09151b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e0f2f1', fontSize: '10px' }} />
                        <Legend style={{ fontSize: '10px', marginTop: '10px' }} />
                        <Line type="monotone" dataKey="temp" stroke="#ff9100" strokeWidth={2.5} name="Temp (°C)" dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="humidity" stroke="#00e5ff" strokeWidth={2.5} name="Humidity (%)" dot={false} />
                        <Line type="monotone" dataKey="moisture" stroke="#00e676" strokeWidth={3.5} name="Moisture (%)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 24 hour history log table */}
                <div className="glossy-panel p-4 flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    📋 24-Hour Telemetry Log
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto mt-2 pr-1" style={{ maxHeight: '200px' }}>
                    <table className="w-full text-[10px] text-left text-[#80cbc4]">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.05)] text-[#4db6ac]">
                          <th className="font-semibold pb-1">Time</th>
                          <th className="font-semibold pb-1 text-center">Temp (°C)</th>
                          <th className="font-semibold pb-1 text-center">Humidity (%)</th>
                          <th className="font-semibold pb-1 text-center">Soil Moisture (%)</th>
                          <th className="font-semibold pb-1 text-right">Pump Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row, idx) => (
                          <tr key={idx} className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.01)]">
                            <td className="py-1.5 font-medium">{row.time}</td>
                            <td className="py-1.5 text-center text-[#e0f2f1]">{row.temp}</td>
                            <td className="py-1.5 text-center text-[#e0f2f1]">{row.humidity}</td>
                            <td className="py-1.5 text-center text-[#e0f2f1]">{row.moisture}</td>
                            <td className={`py-1.5 text-right font-semibold ${row.pump === 'ON' ? 'text-[#00e676]' : 'text-[#80cbc4]'}`}>
                              {row.pump}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <a href="#" className="text-[10px] text-[#00e676] font-semibold hover:underline mt-2 self-end flex items-center gap-1">
                    View Full History <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

              </div>

              {/* Row 3: Recommended Crops and Yield improvement */}
              <div className="crop-yield-row">
                
                {/* Recommended Crops Panel */}
                <div className="glossy-panel p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-[#e0f2f1] flex items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    🌿 Recommended Crops for Your Farm
                  </h3>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {crops.map((crop) => (
                      <div key={crop.id} className="bg-[#09151b] p-3 rounded-lg border border-[rgba(255,255,255,0.02)] flex flex-col gap-2 relative glossy-panel">
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{crop.image}</span>
                          <span className="text-[10px] font-bold text-[#00e676] bg-[rgba(0,230,118,0.08)] py-0.5 px-1.5 rounded">
                            {crop.suitability}%
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#e0f2f1]">{crop.name}</h4>
                          <span className="text-[8px] text-[#00e676]">{crop.potential}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-[8px] text-[#80cbc4] border-t border-[rgba(255,255,255,0.04)] pt-1.5 mt-0.5">
                          <span>Season: {crop.season}</span>
                          <span>Est. Yield: {crop.est_yield}</span>
                        </div>
                        <button className="text-[8px] font-bold text-[#00e676] hover:underline self-start mt-1">View Details</button>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setActiveTab('Recommendations')} className="text-[10px] text-[#00e676] font-semibold hover:underline self-center flex items-center gap-1 mt-1 bg-transparent border-0 cursor-pointer">
                    View All Crop Recommendations <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* AI Yield Improvement panel */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1] flex items-center gap-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    💡 AI Yield Improvement Suggestions
                  </h3>
                  
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Suggestion 1 */}
                    <div className="flex items-start gap-3 bg-[rgba(255,255,255,0.01)] p-2 rounded border border-[rgba(255,255,255,0.02)]">
                      <div className="p-1.5 bg-[rgba(0,229,255,0.08)] rounded mt-0.5">
                        <Droplet className="w-3.5 h-3.5 text-[#00e5ff]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#e0f2f1]">Maintain Soil Moisture</span>
                          <span className="text-[9px] font-bold text-[#00e676]">+15% Yield</span>
                        </div>
                        <p className="text-[8px] text-[#80cbc4] mt-0.5">Current moisture is optimal. Continue regular monitoring.</p>
                      </div>
                    </div>

                    {/* Suggestion 2 */}
                    <div className="flex items-start gap-3 bg-[rgba(255,255,255,0.01)] p-2 rounded border border-[rgba(255,255,255,0.02)]">
                      <div className="p-1.5 bg-[rgba(0,230,118,0.08)] rounded mt-0.5">
                        <Sprout className="w-3.5 h-3.5 text-[#00e676]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#e0f2f1]">Organic Matter</span>
                          <span className="text-[9px] font-bold text-[#00e676]">+12% Yield</span>
                        </div>
                        <p className="text-[8px] text-[#80cbc4] mt-0.5">Add compost or well-rotted manure for better soil structure.</p>
                      </div>
                    </div>

                    {/* Suggestion 3 */}
                    <div className="flex items-start gap-3 bg-[rgba(255,255,255,0.01)] p-2 rounded border border-[rgba(255,255,255,0.02)]">
                      <div className="p-1.5 bg-[rgba(255,145,0,0.08)] rounded mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-[#ff9100]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#e0f2f1]">Balanced Nutrition</span>
                          <span className="text-[9px] font-bold text-[#00e676]">+18% Yield</span>
                        </div>
                        <p className="text-[8px] text-[#80cbc4] mt-0.5">Apply NPK 19:19:19 during early growth stage.</p>
                      </div>
                    </div>

                    {/* Suggestion 4 */}
                    <div className="flex items-start gap-3 bg-[rgba(255,255,255,0.01)] p-2 rounded border border-[rgba(255,255,255,0.02)]">
                      <div className="p-1.5 bg-[rgba(255,255,255,0.04)] rounded mt-0.5">
                        <Sprout className="w-3.5 h-3.5 text-[#80cbc4]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#e0f2f1]">Weed Management</span>
                          <span className="text-[9px] font-bold text-[#00e676]">+10% Yield</span>
                        </div>
                        <p className="text-[8px] text-[#80cbc4] mt-0.5">Keep field clean and free from weeds.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-[rgba(255,255,255,0.05)] pt-2 mt-2">
                    <span className="text-[10px] text-[#80cbc4]">Total Improvement Potential:</span>
                    <span className="text-xs font-bold text-[#00e676]">+55%</span>
                  </div>
                </div>

              </div>

              {/* Row 4: Bottom components (Schedule, Soil Health, Alerts) */}
              <div className="bottom-row">
                
                {/* Irrigation Schedule */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1] flex items-center gap-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    📅 Irrigation Schedule
                  </h3>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1.5">
                        <span className="text-[10px] text-[#80cbc4]">Next Irrigation</span>
                        <span className="text-[10px] font-bold text-[#e0f2f1]">
                          {telemetry.pump_status === 'ON' ? 'Tomorrow, 06:00 AM' : 'Estimated Not Required'}
                        </span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-[10px] text-[#80cbc4]">Duration</span>
                        <span className="text-[10px] font-bold text-[#e0f2f1]">
                          {telemetry.pump_status === 'ON' ? '45 minutes' : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[rgba(0,230,118,0.05)] p-3 rounded-lg border border-[rgba(0,230,118,0.15)] my-3">
                      <p className="text-[9px] text-[#00e676] text-center font-semibold">
                        {telemetry.pump_status === 'ON'
                          ? 'Pump active. Soil Moisture target is 60%'
                          : 'Pump will turn ON automatically when soil moisture < 40%'}
                      </p>
                    </div>

                    <button 
                      onClick={handlePumpToggle}
                      className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {telemetry.pump_status === 'ON' ? 'Deactivate Pump' : 'View Schedule'}
                    </button>
                  </div>
                </div>

                {/* Soil Health Status */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    🌱 Soil Health Status
                  </h3>
                  
                  <div className="flex gap-4 items-center flex-1">
                    {/* Circular Progress Gauge */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle 
                          cx="40" 
                          cy="40" 
                          r="32" 
                          stroke="rgba(255,255,255,0.03)" 
                          strokeWidth="6" 
                          fill="transparent" 
                        />
                        <circle 
                          cx="40" 
                          cy="40" 
                          r="32" 
                          stroke="#00e676" 
                          strokeWidth="6" 
                          fill="transparent" 
                          strokeDasharray="201"
                          strokeDashoffset={201 - (201 * 85) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-extrabold text-[#e0f2f1]">85%</span>
                        <span className="text-[7px] text-[#80cbc4] uppercase tracking-wider font-semibold">Score</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 flex-1">
                      {soilHealth?.details ? (
                        soilHealth.details.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1 text-[10px]">
                            <span className="text-[#80cbc4]">{item.metric}</span>
                            <span className="text-[#e0f2f1] font-bold">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1 text-[10px]">
                            <span className="text-[#80cbc4]">pH Level</span>
                            <span className="text-[#e0f2f1] font-bold">6.8</span>
                          </div>
                          <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1 text-[10px]">
                            <span className="text-[#80cbc4]">Organic Matter</span>
                            <span className="text-[#e0f2f1] font-bold">2.3%</span>
                          </div>
                        </>
                      )}
                      <button onClick={() => setActiveTab('Analytics')} className="text-[8px] font-bold text-[#00e676] hover:underline self-start bg-transparent border-0 cursor-pointer">View Full Report</button>
                    </div>
                  </div>
                </div>

                {/* Real-time Alerts */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1] flex items-center gap-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    🔔 Active System Warnings
                  </h3>
                  
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[140px]">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-2.5 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.02)] p-2 rounded">
                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${alert.type === 'pump_on' ? 'text-[#00e676]' : 'text-amber-400'}`} />
                        <div>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] font-bold text-[#e0f2f1]">{alert.title}</span>
                            <span className="text-[8px] text-[#80cbc4]">{alert.time}</span>
                          </div>
                          <p className="text-[9px] text-[#80cbc4] mt-0.5">{alert.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {activeTab === 'Analytics' && (
            <div className="flex flex-col gap-6">
              {/* Analytics Header */}
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.05)] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>📊 Field Analytics & Sensors</h2>
                  <p className="text-xs text-[#80cbc4]">Detailed sensor comparisons and soil nutrient distribution</p>
                </div>
                <div className="text-xs text-[#80cbc4]">Active Node: <span className="text-[#00e676] font-bold">Hoskote_Main_ESP32</span></div>
              </div>

              {/* Analytics Subgrid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 1: Humidity & Temp Line Chart */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>🌡️ Temperature vs 💧 Humidity</h3>
                  <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="99%" height={220}>
                      <LineChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" stroke="#80cbc4" style={{ fontSize: '9px' }} />
                        <YAxis stroke="#80cbc4" style={{ fontSize: '9px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0d1c24', border: '1px solid rgba(255,255,255,0.1)', color: '#e0f2f1' }} />
                        <Legend style={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="temp" stroke="#ff9100" name="Temp (°C)" strokeWidth={2} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="humidity" stroke="#00e5ff" name="Humidity (%)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: N-P-K Soil Nutrients Bar Chart */}
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>🧪 Soil Health Metrics Detail</h3>
                  <div className="flex flex-col gap-3 mt-1 text-xs">
                    {soilHealth?.details ? (
                      soilHealth.details.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] p-3 rounded">
                          <div className="flex justify-between font-bold">
                            <span className="text-[#e0f2f1]">{item.metric}</span>
                            <span className="text-[#00e676]">{item.value} ({item.status})</span>
                          </div>
                          <div className="w-full bg-[rgba(255,255,255,0.05)] h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.status === 'Optimal' || item.status === 'Good' ? 'bg-[#00e676]' : 'bg-amber-400'}`}
                              style={{ width: item.metric.includes('pH') ? '68%' : item.metric.includes('Organic') ? '76%' : '82%' }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[#80cbc4]">Soil Health metrics loading...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Insights Summary */}
              <div className="glossy-panel p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-[rgba(12,43,41,0.2)] to-[rgba(10,21,27,0.2)]">
                <div className="border-r border-[rgba(255,255,255,0.05)] pr-4 flex flex-col gap-1">
                  <span className="text-xs text-[#80cbc4]">Soil Condition Index</span>
                  <span className="text-xl font-bold text-[#00e676]">Optimal (85/100)</span>
                  <span className="text-[10px] text-[#80cbc4]">Excellent moisture retention capability</span>
                </div>
                <div className="border-r border-[rgba(255,255,255,0.05)] px-4 flex flex-col gap-1">
                  <span className="text-xs text-[#80cbc4]">Daily Water Usage</span>
                  <span className="text-xl font-bold text-[#00e5ff]">120 Liters</span>
                  <span className="text-[10px] text-[#80cbc4]">Based on average 45min pump cycles</span>
                </div>
                <div className="pl-4 flex flex-col gap-1">
                  <span className="text-xs text-[#80cbc4]">AI Recommendation</span>
                  <span className="text-xl font-bold text-[#ff9100]">No Action Required</span>
                  <span className="text-[10px] text-[#80cbc4]">Moisture level is self-sustaining</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Research' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[rgba(255,255,255,0.05)] pb-3">
                <h2 className="text-lg font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>📚 Agricultural Research & Biology</h2>
                <p className="text-xs text-[#80cbc4]">Agronomic guides and localized research reports for Hoskote region</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#00e676] flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Banana Cultivation Guide
                  </h3>
                  <p className="text-xs text-[#80cbc4] leading-relaxed">
                    Banana plants thrive in warm, high-humidity plateau terrains. Optimal growth requires a soil pH between 6.0 and 7.5. Because banana roots require consistent moisture but are prone to root rot under waterlogged conditions, the **Neuro VP Dhara Core** automatic irrigation trigger keeps the target soil moisture at 60% with short, frequent watering intervals.
                  </p>
                  <div className="mt-2 p-2.5 bg-[#09151b] rounded border border-[rgba(255,255,255,0.03)] text-[11px] text-[#80cbc4]">
                    <strong>Research Fact:</strong> Potassium is the key macronutrient for bunch size and fruit quality. Ensure soil Potassium (K) levels are maintained above 180 mg/kg.
                  </div>
                </div>

                <div className="glossy-panel p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#00e5ff] flex items-center gap-2">
                    <Compass className="w-4 h-4" /> Hoskote Region Soil Report
                  </h3>
                  <p className="text-xs text-[#80cbc4] leading-relaxed">
                    Soil types in the Hoskote plateau predominantly consist of red clay loam. This soil has high iron oxide content, good drainage, and high potassium release capacity. However, organic matter (Humus) is typically low (around 1.2%). Adding organic vermicompost is highly recommended to improve nitrogen retention.
                  </p>
                  <div className="mt-2 p-2.5 bg-[#09151b] rounded border border-[rgba(255,255,255,0.03)] text-[11px] text-[#80cbc4]">
                    <strong>Optimal pH Guide:</strong> Ideal soil pH for Turmeric is 5.5 to 6.5, which perfectly matches our current reading of 6.8 with slight amendments.
                  </div>
                </div>
              </div>

              {/* Research Articles List */}
              <div className="glossy-panel p-4">
                <h3 className="text-sm font-bold text-[#e0f2f1] mb-3">Recent Agricultural Bulletins</h3>
                <div className="flex flex-col gap-2.5">
                  {[
                    { title: "Managing Soil Salinity in Solar-Powered Micro-Irrigation Systems", date: "Jan 2026", author: "ICAR Bengaluru" },
                    { title: "Improving Water Use Efficiency for Ginger and Turmeric Intercropping", date: "Feb 2026", author: "UAS GKVK Campus" },
                    { title: "Mitigating Heat Stress in Open-Field Plantation Crops", date: "Mar 2026", author: "Dhara Core Labs" }
                  ].map((art, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-[rgba(255,255,255,0.03)] pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="text-xs font-semibold text-[#e0f2f1] hover:text-[#00e676] cursor-pointer transition-all">{art.title}</span>
                        <p className="text-[10px] text-[#80cbc4]">{art.author}</p>
                      </div>
                      <span className="text-[9px] text-[#80cbc4]">{art.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Recommendations' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[rgba(255,255,255,0.05)] pb-3">
                <h2 className="text-lg font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>🌿 Custom Crop Recommendations</h2>
                <p className="text-xs text-[#80cbc4]">AI-driven matching scores based on soil NPK, moisture and local Hoskote climate</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crops.map((crop) => (
                  <div key={crop.id} className="glossy-panel p-5 flex gap-4">
                    <span className="text-4xl p-2 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg self-start">{crop.image}</span>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[#e0f2f1]">{crop.name}</h3>
                        <span className="text-xs font-bold text-[#00e676] bg-[rgba(0,230,118,0.08)] py-0.5 px-2 rounded">
                          {crop.suitability}% Suitability Match
                        </span>
                      </div>
                      <span className="text-[10px] text-[#00e5ff] font-semibold">{crop.potential}</span>
                      <p className="text-[11px] text-[#80cbc4] leading-relaxed">
                        {crop.name === 'Banana' && "Highly suited for current warm weather and rich loam content. High watering frequency matches automated sensor trigger thresholds."}
                        {crop.name === 'Tea' && "Requires well-drained, acidic soil. Current pH (6.8) is slightly high; organic fertilizer application recommended."}
                        {crop.name === 'Turmeric' && "Ideal crop for the Hoskote monsoon period. Low risk index and highly tolerant to short water delays."}
                        {crop.name === 'Ginger' && "Good intercropping candidate with banana. High demand in regional Hoskote APMC market."}
                      </p>
                      <div className="flex gap-4 text-[10px] text-[#80cbc4] border-t border-[rgba(255,255,255,0.03)] pt-2 mt-1">
                        <span>Season: <strong>{crop.season}</strong></span>
                        <span>Estimated Yield: <strong>{crop.est_yield}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Market' && (
            <div className="flex flex-col gap-4">
              <div className="border-b border-[rgba(255,255,255,0.05)] pb-3">
                <h2 className="text-lg font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>🛒 Hoskote Local Market Rates</h2>
                <p className="text-xs text-[#80cbc4]">Live crop selling rates and price trends in local APMC market</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Banana (Robusta)', price: '₹42 / kg', trend: '+12.1%', up: true, demand: 'High' },
                  { name: 'Ginger (Local)', price: '₹125 / kg', trend: '+5.4%', up: true, demand: 'Very High' },
                  { name: 'Turmeric (Raw)', price: '₹138 / kg', trend: '-1.2%', up: false, demand: 'Stable' },
                  { name: 'Tea Leaves', price: '₹240 / kg', trend: 'Stable', up: true, demand: 'Moderate' }
                ].map((item, idx) => (
                  <div key={idx} className="glossy-panel p-4 flex flex-col gap-2">
                    <span className="text-xs text-[#80cbc4] font-semibold">{item.name}</span>
                    <span className="text-2xl font-bold text-[#e0f2f1]">{item.price}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-bold ${item.up ? 'text-[#00e676]' : 'text-red-400'}`}>
                        {item.trend}
                      </span>
                      <span className="text-[9px] bg-[#09151b] px-2 py-0.5 rounded-full text-[#80cbc4]">
                        {item.demand} Demand
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Index Chart */}
              <div className="glossy-panel p-4">
                <h3 className="text-sm font-bold text-[#e0f2f1] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>APMC Price Index - Last 3 Months</h3>
                <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="99%" height={180}>
                    <LineChart data={[
                      { month: 'Mar', Ginger: 110, Turmeric: 142, Banana: 36 },
                      { month: 'Apr', Ginger: 118, Turmeric: 140, Banana: 38 },
                      { month: 'May', Ginger: 125, Turmeric: 138, Banana: 42 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#80cbc4" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#80cbc4" style={{ fontSize: '10px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d1c24', border: '1px solid rgba(255,255,255,0.1)', color: '#e0f2f1' }} />
                      <Legend style={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="Ginger" stroke="#00e5ff" strokeWidth={2} />
                      <Line type="monotone" dataKey="Turmeric" stroke="#ff9100" strokeWidth={2} />
                      <Line type="monotone" dataKey="Banana" stroke="#00e676" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="flex flex-col gap-4 max-w-2xl">
              <div className="border-b border-[rgba(255,255,255,0.05)] pb-3">
                <h2 className="text-lg font-bold text-[#e0f2f1]" style={{ fontFamily: "'Outfit', sans-serif" }}>⚙️ System Settings</h2>
                <p className="text-xs text-[#80cbc4]">Manage device configurations and credentials</p>
              </div>

              <div className="glossy-panel p-6 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-[#e0f2f1] border-b border-[rgba(255,255,255,0.05)] pb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>📶 WiFi Credentials</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#80cbc4] font-semibold">SSID</label>
                    <input type="text" placeholder="DharaCore_WiFi" className="bg-[#09151b] border border-[rgba(255,255,255,0.05)] rounded px-3 py-1.5 text-xs text-[#e0f2f1] focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#80cbc4] font-semibold">PASSWORD</label>
                    <input type="password" value="••••••••••••" readOnly className="bg-[#09151b] border border-[rgba(255,255,255,0.05)] rounded px-3 py-1.5 text-xs text-[#e0f2f1] focus:outline-none" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#e0f2f1] border-b border-[rgba(255,255,255,0.05)] pb-2 mt-4" style={{ fontFamily: "'Outfit', sans-serif" }}>📡 MQTT Broker Config</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-[10px] text-[#80cbc4] font-semibold">HOST</label>
                    <input type="text" value="broker.hivemq.com" readOnly className="bg-[#09151b] border border-[rgba(255,255,255,0.05)] rounded px-3 py-1.5 text-xs text-[#e0f2f1] focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#80cbc4] font-semibold">PORT</label>
                    <input type="text" value="1883" readOnly className="bg-[#09151b] border border-[rgba(255,255,255,0.05)] rounded px-3 py-1.5 text-xs text-[#e0f2f1] focus:outline-none" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#e0f2f1] border-b border-[rgba(255,255,255,0.05)] pb-2 mt-4" style={{ fontFamily: "'Outfit', sans-serif" }}>🔥 Firebase Database</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#80cbc4] font-semibold">DATABASE URL</label>
                  <input type="text" value="https://neurovpdharacore-default-rtdb.firebaseio.com" readOnly className="bg-[#09151b] border border-[rgba(255,255,255,0.05)] rounded px-3 py-1.5 text-xs text-[#e0f2f1] focus:outline-none" />
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  <button className="px-4 py-2 bg-[#0d1c24] hover:bg-[#122732] border border-[rgba(255,255,255,0.05)] text-xs text-[#80cbc4] rounded transition-all">Cancel</button>
                  <button className="px-4 py-2 bg-[rgba(0,230,118,0.2)] text-[#00e676] border border-[#00e676] hover:bg-[#00e676] hover:text-[#060e12] text-xs font-semibold rounded transition-all">Save Changes</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Floating Interactive Chat Drawer */}
      {chatOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#0a151b] border-l border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-3d)] z-50 flex flex-col overflow-hidden glossy-panel">
          {/* Gloss overlay */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-bottom from-[rgba(255,255,255,0.03)] to-transparent pointer-events-none z-0" />
          
          {/* Chat Header */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center bg-[#0d1c24] relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00e676] pulse-active" />
              <div>
                <h3 className="text-sm font-bold text-[#e0f2f1]">Shakti Agri Assistant</h3>
                <span className="text-[9px] text-[#00e676] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] inline-block"></span>
                  AI Assistant Live
                </span>
              </div>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="p-1.5 bg-[#09151b] hover:bg-[#122732] rounded-full border border-[rgba(255,255,255,0.05)] text-[#80cbc4] hover:text-[#e0f2f1]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 relative z-10">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-[#00e676] text-[#060e12] self-end rounded-br-none font-medium' 
                    : 'bg-[#0d1c24] text-[#e0f2f1] self-start rounded-bl-none border border-[rgba(255,255,255,0.03)]'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div className="bg-[#0d1c24] text-[#e0f2f1] self-start rounded-lg rounded-bl-none p-3 text-xs border border-[rgba(255,255,255,0.03)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[rgba(255,255,255,0.05)] bg-[#0d1c24] flex gap-2 relative z-10">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about crops, pump, moisture..." 
              className="flex-1 bg-[#09151b] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-xs text-[#e0f2f1] focus:outline-none focus:border-[#00e676] transition-all"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || chatLoading}
              className="p-2 bg-[rgba(0,230,118,0.15)] text-[#00e676] border border-[#00e676] hover:bg-[#00e676] hover:text-[#060e12] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Footer Details */}
      <footer className="w-full max-w-7xl mx-auto flex items-center justify-between text-[9px] text-[#4db6ac] mt-4 pt-3 border-t border-[rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#00e676]" />
          <span>Data Last Updated: 3 February 2026, 06:30 PM</span>
        </div>
        <span>All values are live and captured from connected sensors.</span>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-[#00e676]" />
          <span className="font-semibold">IoT Connection Active</span>
        </div>
      </footer>
    </div>
  );
}
