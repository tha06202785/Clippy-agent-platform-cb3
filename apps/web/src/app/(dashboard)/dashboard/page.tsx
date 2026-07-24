"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageCircle, Calendar, CheckCircle, Zap, TrendingUp, Users, DollarSign, 
  Clock, Home, Brain, Sparkles, ArrowUpRight, Activity, AlertCircle, 
  Star, Phone, Mail, Send, Bell, Sun, Cloud
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    inspections: 0,
    hotLeads: 0,
    pipelineValue: 0,
    responseTime: 0,
    commissionGenerated: 0,
    timeSaved: 0,
    repliesToday: 0,
    aiScore: 0,
    relationshipHealth: { hot: 0, warm: 0, cold: 0 },
  });

  const [priorities, setPriorities] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [greeting, setGreeting] = useState("");
  const [subGreeting, setSubGreeting] = useState("");
  const [agentName, setAgentName] = useState("Sarah");
  const [weather, setWeather] = useState({ temp: 22, condition: "sunny", location: "Sydney" });


  useEffect(() => {
    // Get agent's location for weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true");
          const data = await res.json();
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          let condition = "sunny";
          if (code >= 61 && code <= 67) condition = "rainy";
          else if (code >= 71 && code <= 77) condition = "snowy";
          else if (code >= 80 && code <= 82) condition = "rainy";
          else if (code >= 95) condition = "stormy";
          else if (code >= 3 && code <= 48) condition = "cloudy";
          
          // Reverse geocode to get city name
          const geoRes = await fetch("https://api.bigdatacloud.net/v1/reverse-geocode?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=en");
          const geoData = await geoRes.json();
          const city = geoData.city || geoData.locality || "Sydney";
          
          console.log("Weather updated:", { temp, condition, location: city });
          setWeather({ temp, condition, location: city });
          // Location updated in weather state
        } catch (err) {
          console.error("Weather fetch failed:", err);
          console.log("Using default weather: Sydney 22°C");
        }
      }, () => {
        console.log("Location permission denied or timeout");
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
    }
    
    const hour = new Date().getHours();
    const greetings = [
      { start: "👋 Good morning", sub: "I cleared your inbox before coffee.", time: [5, 12] },
      { start: "☀️ Good afternoon", sub: "Three buyers need your attention.", time: [12, 17] },
      { start: "🌙 Good evening", sub: "You crushed it today.", time: [17, 22] },
      { start: "🌟 Welcome back", sub: "I found opportunities while you were away.", time: [22, 5] },
    ];
    
    const matched = greetings.find(g => {
      if (g.time[0] > g.time[1]) {
        return hour >= g.time[0] || hour < g.time[1];
      }
      return hour >= g.time[0] && hour < g.time[1];
    }) || greetings[0];
    
    setGreeting(matched.start + ", " + agentName);
    setSubGreeting(matched.sub);

    fetch("/api/principal/dashboard")
      .then(r => r.json())
      .then(data => {
        setStats({
          conversations: data.conversations?.today || 0,
          inspections: data.inspections?.today || 0,
          hotLeads: data.hotLeads?.length || 0,
          pipelineValue: data.pipelineValue || 0,
          responseTime: data.responseTime || 27,
          commissionGenerated: data.commissionGenerated || 126000,
          timeSaved: data.timeSaved || 3.7,
          repliesToday: data.repliesToday || 14,
          aiScore: data.aiScore || 98,
          relationshipHealth: data.relationshipHealth || { hot: 32, warm: 18, cold: 6 },
        });
        
        setPriorities([
          {
            id: 1,
            urgency: "red",
            title: "Buyer is ready to make an offer",
            confidence: 87,
            action: "Call before 2 PM",
            icon: Star,
            leadName: "Sarah Chen",
          },
          {
            id: 2,
            urgency: "orange",
            title: "Vendor opened your proposal 5 times",
            confidence: 94,
            action: "Recommend follow-up",
            icon: Activity,
            leadName: "Michael Torres",
          },
          {
            id: 3,
            urgency: "green",
            title: "Inspection confirmation pending",
            confidence: 96,
            action: "One click to approve",
            icon: Calendar,
            leadName: "Emma Richardson",
          },
        ]);

        setRecommendations([
          {
            id: 1,
            title: "Sarah opened your email six times",
            why: "High engagement indicates strong interest",
            action: "Recommend calling today",
            confidence: 94,
            icon: Phone,
          },
          {
            id: 2,
            title: "Three buyers match 25 Collins Street",
            why: "All searched in same price range last week",
            action: "Generate shortlist?",
            confidence: 89,
            icon: Home,
          },
          {
            id: 3,
            title: "Inspection attendance predicted 96%",
            why: "Based on past behavior and response time",
            action: "Send reminder?",
            confidence: 96,
            icon: Bell,
          },
        ]);
      })
      .catch(() => {});
  }, []);

  const timelineEvents = [
    { time: "09:01", event: "REA enquiry received", icon: MessageCircle, color: "text-emerald-600" },
    { time: "09:02", event: "Clippy replied in 28 seconds", icon: Zap, color: "text-emerald-600" },
    { time: "09:04", event: "Buyer qualified - Budget 50k", icon: CheckCircle, color: "text-emerald-600" },
    { time: "09:06", event: "Inspection booked for Saturday 2pm", icon: Calendar, color: "text-emerald-600" },
    { time: "09:08", event: "Reminder sent to buyer", icon: Bell, color: "text-emerald-600" },
    { time: "09:10", event: "Lead moved to Hot Buyers", icon: TrendingUp, color: "text-emerald-600" },
  ];

  const metricCards = [
    {
      title: "Replies Today",
      value: stats.repliesToday,
      change: "▲ 32% vs Yesterday",
      icon: MessageCircle,
      color: "bg-white",
      iconColor: "text-emerald-600",
    },
    {
      title: "Money Waiting",
      value: "$" + (stats.commissionGenerated / 1000).toFixed(0) + "k",
      change: "Potential Commission",
      icon: DollarSign,
      color: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "AI Productivity Score",
      value: stats.aiScore + "%",
      change: "Top 5% of agents today",
      icon: Sparkles,
      color: "bg-white",
      iconColor: "text-purple-600",
    },
    {
      title: "Avg Response Time",
      value: stats.responseTime + "s",
      change: "Excellent",
      icon: Clock,
      color: "bg-white",
      iconColor: "text-emerald-600",
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "red": return "bg-red-50 border-red-200";
      case "orange": return "bg-orange-50 border-orange-200";
      case "green": return "bg-emerald-50 border-emerald-200";
      default: return "bg-white border-neutral-200";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "red": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "orange": return <Bell className="w-5 h-5 text-orange-600" />;
      case "green": return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default: return <AlertCircle className="w-5 h-5 text-neutral-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        
        {/* AI Greeting Card - Simplified pastel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-6 md:p-8 shadow-sm border border-emerald-100"
        >
          <div className="flex items-start gap-4 mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <div className="flex-1">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl md:text-3xl font-bold text-neutral-800 mb-1"
              >
                {greeting}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-base text-neutral-600 mb-1"
              >
                {subGreeting}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-sm text-neutral-500 font-medium"
              >
                {new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at {new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} {weather.location.includes("Sydney") || weather.location.includes("Melbourne") || weather.location.includes("Brisbane") || weather.location.includes("Canberra") ? "AEST" : weather.location.includes("Adelaide") ? "ACST" : weather.location.includes("Perth") ? "AWST" : "Local"}
              </motion.p>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              {weather.condition === "sunny" ? <Sun className="w-5 h-5 text-amber-500" /> : <Cloud className="w-5 h-5 text-neutral-500" />}
              <span>{weather.temp}°C {weather.location}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {[
              { icon: MessageCircle, text: "Replied to enquiries", value: "14", color: "text-emerald-600" },
              { icon: Calendar, text: "Booked inspections", value: "3", color: "text-emerald-600" },
              { icon: CheckCircle, text: "Qualified buyers", value: "6", color: "text-emerald-600" },
              { icon: Home, text: "Generated listings", value: "2", color: "text-emerald-600" },
              { icon: Clock, text: "Follow-ups scheduled", value: "5", color: "text-emerald-600" },
              { icon: DollarSign, text: "Money waiting", value: "26k", color: "text-emerald-600" },
            ].map((action, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-neutral-100 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <action.icon className={cn("w-5 h-5", action.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-neutral-800">{action.value}</div>
                  <div className="text-xs text-neutral-600 truncate">{action.text}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-neutral-600">Time saved today</div>
                <div className="text-lg font-bold text-neutral-800">{stats.timeSaved} hours</div>
              </div>
            </div>
            <a
              href="/copilot"
              className="btn-premium bg-emerald-500 text-white px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all text-base font-semibold shadow-md hover:shadow-lg"
            >
              ✨ Ask Clippy Anything
            </a>
          </div>
        </motion.div>

        {/* Today's Priorities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-neutral-800">🎯 If I were you...</h2>
            <span className="text-sm text-neutral-500 ml-auto">3 urgent items</span>
          </div>
          
          <div className="space-y-3">
            {priorities.map((priority, i) => (
              <motion.div
                key={priority.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={cn(
                  "rounded-xl border-2 p-4 transition-all duration-300 hover:shadow-md cursor-pointer",
                  getUrgencyColor(priority.urgency)
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getUrgencyIcon(priority.urgency)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-neutral-800 mb-1">{priority.title}</h3>
                        <p className="text-sm text-neutral-600">{priority.leadName}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-full",
                          priority.urgency === "red" ? "bg-red-100 text-red-700" :
                          priority.urgency === "orange" ? "bg-orange-100 text-orange-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {priority.confidence}% Clippy Confidence™
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button className="btn-premium bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 shadow-sm">
                        {priority.action}
                      </button>
                      <button className="btn-premium bg-white text-neutral-700 border border-neutral-200 px-4 py-2 rounded-lg text-sm hover:bg-neutral-50">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-neutral-800">Today's AI Suggestions</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="rounded-xl border-2 border-neutral-200 p-5 bg-white hover:border-purple-300 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <rec.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-800 text-sm">{rec.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 mb-3">{rec.why}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                    {rec.confidence}% Clippy Confidence™
                  </span>
                  <button className="text-xs font-semibold text-emerald-600 hover:underline">
                    {rec.action}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* KPI Cards - Simplified colors */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className={cn("rounded-xl p-5 shadow-sm border border-neutral-100 hover:shadow-md transition-all duration-300", card.color)}>
                <div className="flex items-center justify-between mb-3">
                  <card.icon className={cn("w-5 h-5", card.iconColor)} />
                </div>
                <div className="text-2xl font-bold text-neutral-800 mb-1">{card.value}</div>
                <div className="text-sm text-neutral-700 font-medium">{card.title}</div>
                {card.change && (
                  <div className="text-xs text-neutral-600 mt-1">
                    <span className={card.change.includes("▲") ? "text-emerald-600 font-semibold" : ""}>{card.change}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Relationship Health & AI Timeline */}
        <div className="grid lg:grid-cols-3 gap-6">
  
        {/* AI Memory - Moat Feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl shadow-sm border-0 bg-gradient-to-br from-purple-50 to-white p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-neutral-800">🧠 Things I Remember</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-purple-100">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">📱</span>
              </div>
              <div>
                <div className="font-semibold text-neutral-800 text-sm">Sarah prefers SMS</div>
                <div className="text-xs text-neutral-600">Never calls before 6pm</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-purple-100">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">⏰</span>
              </div>
              <div>
                <div className="font-semibold text-neutral-800 text-sm">Michael negotiates after inspections</div>
                <div className="text-xs text-neutral-600">Best to discuss price in person</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-purple-100">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">🌅</span>
              </div>
              <div>
                <div className="font-semibold text-neutral-800 text-sm">Emma never answers before 10am</div>
                <div className="text-xs text-neutral-600">Prefers afternoon communication</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Relationship Health */}
          <div className="rounded-2xl shadow-sm border-0 bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-neutral-800">Relationship Health</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-800">{stats.relationshipHealth.hot} Hot Buyers</div>
                    <div className="text-xs text-neutral-600">Ready to act</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-800">{stats.relationshipHealth.warm} Warm Buyers</div>
                    <div className="text-xs text-neutral-600">Needs nurturing</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-800">{stats.relationshipHealth.cold} Going Cold</div>
                    <div className="text-xs text-neutral-600">Action needed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Timeline */}
          <div className="lg:col-span-2 rounded-2xl shadow-sm border-0 bg-white overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-neutral-800">🤖 Watch Clippy Work</h2>
              </div>
              <p className="text-xs text-neutral-600 mt-1">Watch Clippy work in real-time</p>
            </div>
            <div className="p-5 space-y-3">
              {timelineEvents.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-14 text-xs font-mono text-neutral-500 pt-1">
                    {event.time}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <event.icon className={cn("w-4 h-4", event.color)} />
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-neutral-50">
                    <div className="text-sm font-medium text-neutral-800">{event.event}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
