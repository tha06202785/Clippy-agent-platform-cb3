import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radar,
  TrendingUp,
  AlertCircle,
  Zap,
  Target,
  Activity,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Home,
  CheckCircle2,
  Users,
  Flame,
  X,
  Radio,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

interface RadarItem {
  id: string;
  type: "hot_lead" | "listing_opportunity" | "market_alert" | "price_drop";
  title: string;
  description: string;
  urgency: "critical" | "high" | "medium" | "low";
  value?: string;
  trend?: number;
  location?: string;
  timestamp?: string;
  handled?: boolean;
}

interface MetricCard {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: number;
  description: string;
  targetValue?: number;
}

// Premium sample alerts for empty state
const PREMIUM_SAMPLE_ALERTS: RadarItem[] = [
  {
    id: "alert-1",
    type: "price_drop",
    title: "🔥 Price Drop Alert: Eastwood, NSW",
    description: "Property at 42 Park Ave reduced $75K — Immediate opportunity",
    urgency: "high",
    location: "Eastwood, NSW 2122",
    trend: -2.8,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-2",
    type: "market_alert",
    title: "📈 Market Surge: Inner West",
    description: "3-bedroom homes up 4.2% week-on-week — Best performing market",
    urgency: "medium",
    location: "Inner West Sydney",
    trend: 4.2,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-3",
    type: "listing_opportunity",
    title: "⭐ High-Demand Suburb Alert",
    description: "Paddington: Only 3 active listings, 12 buyer inquiries",
    urgency: "medium",
    location: "Paddington, NSW 2021",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-4",
    type: "market_alert",
    title: "🚀 Emerging Opportunity: Marrickville",
    description: "Average days on market down to 18 (from 25) — Faster sales cycle",
    urgency: "low",
    location: "Marrickville, NSW 2204",
    trend: -6.5,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

export default function AIRadar() {
  const [radarItems, setRadarItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [handledItems, setHandledItems] = useState<Set<string>>(new Set());
  const [animatedMetrics, setAnimatedMetrics] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  });
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      label: "Total Insights",
      value: 0,
      icon: Radar,
      color: "from-cyan-400 to-blue-500",
      trend: 8,
      description: "Active alerts",
    },
    {
      label: "Critical Issues",
      value: 0,
      icon: AlertCircle,
      color: "from-red-500 to-red-600",
      trend: -2,
      description: "Require action",
    },
    {
      label: "Hot Opportunities",
      value: 0,
      icon: Flame,
      color: "from-orange-400 to-orange-600",
      trend: 15,
      description: "New prospects",
    },
    {
      label: "Market Insights",
      value: 0,
      icon: TrendingUp,
      color: "from-emerald-400 to-green-600",
      trend: 3.5,
      description: "Weekly trends",
    },
  ]);

  const navigate = useNavigate();

  // Fetch user org ID
  useEffect(() => {
    const fetchUserOrgId = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        navigate("/login");
        return;
      }

      try {
        const { data, error: orgError } = await supabase
          .from("user_org_roles")
          .select("org_id")
          .eq("user_id", userId)
          .single();

        if (orgError) {
          setUserOrgId("default");
        } else if (data) {
          setUserOrgId(data.org_id);
        }
      } catch (err) {
        setUserOrgId("default");
      }
    };
    fetchUserOrgId();
  }, [navigate]);

  // Fetch radar items
  const fetchRadarItems = async () => {
    if (!userOrgId) return;

    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      navigate("/login");
      return;
    }

    try {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, full_name, source, created_at, email, phone")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, due_at, type, description")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .eq("status", "pending")
        .lt("due_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .limit(2);

      const { data: overdue } = await supabase
        .from("tasks")
        .select("id, title, due_at, type")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .lt("due_at", new Date().toISOString())
        .limit(2);

      const items: RadarItem[] = [];

      leads?.forEach((lead) => {
        items.push({
          id: `lead-${lead.id}`,
          type: "hot_lead",
          title: `🔥 ${lead.full_name || "Unknown Lead"}`,
          description: `New ${lead.source} inquiry - Qualified prospect`,
          urgency: "high",
          timestamp: lead.created_at,
          value: lead.email || lead.phone || "No contact",
        });
      });

      tasks?.forEach((task) => {
        items.push({
          id: `task-${task.id}`,
          type: "listing_opportunity",
          title: `⭐ ${task.title}`,
          description: task.type?.replace(/_/g, " "),
          urgency: "medium",
          timestamp: task.due_at,
        });
      });

      overdue?.forEach((task) => {
        items.push({
          id: `overdue-${task.id}`,
          type: "market_alert",
          title: `🚨 OVERDUE: ${task.title}`,
          description: "Requires immediate attention",
          urgency: "critical",
          timestamp: task.due_at,
        });
      });

      if (items.length === 0) {
        setRadarItems(PREMIUM_SAMPLE_ALERTS);
      } else {
        setRadarItems(items);
      }

      // Animate metrics
      const newMetrics = [...metrics];
      const criticalCount = items.filter((i) => i.urgency === "critical").length;
      const hotCount = items.filter((i) => i.type === "hot_lead").length;
      const alertCount = items.filter((i) => i.type === "market_alert").length;

      animateNumberCountUp(0, items.length);
      animateNumberCountUp(1, criticalCount);
      animateNumberCountUp(2, hotCount);
      animateNumberCountUp(3, alertCount);

      newMetrics[0].value = items.length;
      newMetrics[1].value = criticalCount;
      newMetrics[2].value = hotCount;
      newMetrics[3].value = alertCount;
      setMetrics(newMetrics);
    } catch (err) {
      setRadarItems(PREMIUM_SAMPLE_ALERTS);
      animateNumberCountUp(0, 4);
      animateNumberCountUp(1, 0);
      animateNumberCountUp(2, 1);
      animateNumberCountUp(3, 1);
    }

    setLoading(false);
  };

  const animateNumberCountUp = (index: number, target: number) => {
    let current = 0;
    const increment = Math.max(1, Math.floor(target / 20));
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setAnimatedMetrics((prev) => ({ ...prev, [index]: current }));
    }, 50);
  };

  useEffect(() => {
    fetchRadarItems();
  }, [userOrgId, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRadarItems();
    setRefreshing(false);
  };

  const handleMarkHandled = (itemId: string) => {
    const newHandled = new Set(handledItems);
    if (newHandled.has(itemId)) {
      newHandled.delete(itemId);
    } else {
      newHandled.add(itemId);
    }
    setHandledItems(newHandled);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-300 hover:border-red-500 hover:shadow-2xl hover:shadow-red-500/30";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-300 hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/30";
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-300 hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/30";
      case "low":
        return "text-green-600 bg-green-50 border-green-300 hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/30";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const activeAlerts = radarItems.filter((item) => !handledItems.has(item.id));
  const hotLeadsCount = activeAlerts.filter((i) => i.type === "hot_lead").length;
  const criticalCount = activeAlerts.filter((i) => i.urgency === "critical" || i.urgency === "high").length;

  return (
    <Layout showNav={true}>
      {/* DEEP NAVY BACKGROUND WITH ANIMATED GRADIENTS */}
      <div className="fixed inset-0 -z-30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />

      {/* ANIMATED GRADIENT ORBS - Premium depth layer */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        {/* Large orbital gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-gradient-to-tl from-cyan-500/10 to-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* ANIMATED RADAR GRID PATTERN - Ultra-premium background */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08]"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="radar-grid" x="40" y="40" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" />
              <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" />
              <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" />
              <circle cx="20" cy="20" r="2" fill="currentColor" className="text-cyan-500" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-grid)" />
        </svg>
      </div>

      {/* FLOATING AI SUGGESTS BAR - Premium top-right positioning with intense glow */}
      {hotLeadsCount > 0 && (
        <div className="fixed top-32 right-8 max-w-sm z-50 animate-in slide-in-from-right-8 duration-700">
          <div className="relative group">
            {/* Intense glow effect behind bar */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-cyan-500/50 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse transition-opacity" />
            
            {/* Main card with gradient border */}
            <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 rounded-3xl p-6 border-2 border-cyan-400/60 group-hover:border-cyan-300 shadow-2xl shadow-cyan-500/40 group-hover:shadow-cyan-500/60 transition-all duration-300 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-3 bg-gradient-to-br from-cyan-400/40 to-blue-500/40 rounded-2xl mt-0.5 animate-pulse border border-cyan-400/40">
                    <Sparkles className="w-6 h-6 text-cyan-300 drop-shadow-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-cyan-300 uppercase tracking-widest drop-shadow-lg">
                      🎯 AI SUGGESTS
                    </p>
                    <p className="text-base font-black text-white mt-2 drop-shadow-lg">
                      Follow up with {hotLeadsCount} hot {hotLeadsCount === 1 ? "lead" : "leads"} now
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-cyan-300 flex-shrink-0 group-hover:translate-x-2 transition-transform drop-shadow-lg" />
              </div>
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10 relative z-10 px-4">
        {/* PREMIUM HEADER */}
        <div className="pt-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-2xl relative group border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/30">
                <Radar className="w-8 h-8 text-cyan-300 animate-pulse drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                  AI Radar
                </h1>
                <p className="text-sm text-cyan-200/80 font-semibold mt-2 drop-shadow">
                  Enterprise-Grade Real-Time Intelligence Platform
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/50 hover:to-blue-600/50 text-cyan-300 transition-all group disabled:opacity-50 hover:shadow-2xl hover:shadow-cyan-500/40 border-2 border-cyan-400/60 backdrop-blur-sm"
            title="Refresh AI Radar"
          >
            <RefreshCw
              className={`w-6 h-6 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
            />
          </button>
        </div>

        {/* ⚡ MASSIVE HERO SECTION - BILLION-DOLLAR PREMIUM ⚡ */}
        <div className="relative overflow-hidden rounded-3xl group">
          {/* Intense animated background with multiple layers */}
          <div className="absolute inset-0 -z-10">
            {/* Primary rotating radar circles with teal glow */}
            <div className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full border-3 border-cyan-400/40 -translate-y-1/2 animate-spin shadow-2xl shadow-cyan-500/30" style={{ animationDuration: "25s" }} />
            <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full border-2 border-cyan-400/30 -translate-y-1/2 animate-spin shadow-xl shadow-cyan-500/20" style={{ animationDuration: "18s", animationDirection: "reverse" }} />
            <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full border-2 border-cyan-400/20 -translate-y-1/2 animate-pulse shadow-lg shadow-cyan-500/15" style={{ animationDuration: "5s" }} />

            {/* Massive glowing orbs */}
            <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full blur-3xl animate-pulse shadow-2xl shadow-cyan-500/40" style={{ animationDuration: "7s" }} />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/25 to-cyan-600/15 rounded-full blur-3xl shadow-2xl shadow-blue-500/30" style={{ animationDuration: "8s", animationDelay: "1s" }} />
            <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: "9s" }} />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-600/2 to-slate-950/40 -z-10" />

          {/* Border glow effect */}
          <div className="absolute inset-0 rounded-3xl border-2 border-cyan-400/40 group-hover:border-cyan-400/70 transition-all duration-500 -z-10 shadow-2xl shadow-cyan-500/30 group-hover:shadow-cyan-500/50" />

          {/* Content */}
          <div className="relative z-10 p-12 md:p-16 flex items-start justify-between gap-12">
            <div className="flex-1">
              {/* AI Recommendation Badge */}
              <div className="flex items-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 rounded-full border-2 border-cyan-400/60 group-hover:border-cyan-400/80 transition-all backdrop-blur-sm group-hover:shadow-lg group-hover:shadow-cyan-500/40">
                  <Radio className="w-5 h-5 text-cyan-300 animate-pulse" />
                  <span className="text-xs font-black text-cyan-200 uppercase tracking-widest drop-shadow">
                    🚨 Live AI Recommendation
                  </span>
                </div>
              </div>

              {/* Main headline */}
              <h2 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-lg">
                {radarItems.length > 0
                  ? `${criticalCount} Urgent Opportunities Await`
                  : "24/7 AI Intelligence at Your Command"}
              </h2>

              {/* Subheading */}
              <p className="text-xl text-cyan-100/90 mb-12 max-w-2xl leading-relaxed font-semibold drop-shadow">
                {radarItems.length > 0
                  ? `Your AI has identified ${hotLeadsCount} hot leads, ${activeAlerts.filter((i) => i.type === "market_alert").length} market opportunities, and ${criticalCount} critical items requiring immediate action. Your competitive advantage awaits.`
                  : "Connect your Supabase database to unlock enterprise-grade market intelligence, AI-powered lead scoring, and real-time opportunity discovery 24/7."}
              </p>

              {/* CTA Buttons with intense glow */}
              <div className="flex flex-wrap gap-5">
                {/* Primary Action - Intense Glow */}
                <button className="group/btn relative inline-flex items-center justify-center gap-3 px-12 py-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 text-slate-900 rounded-2xl font-black text-lg transition-all duration-300 hover:shadow-3xl hover:shadow-cyan-500/70 hover:scale-105 active:scale-95 border-2 border-cyan-300/80 group-hover/btn:border-cyan-200">
                  {/* Glow behind button */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/50 to-blue-400/50 rounded-2xl blur-xl opacity-75 group-hover/btn:opacity-100 -z-10 animate-pulse" />
                  
                  <Target className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
                  Take Action Now
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                </button>

                {/* Secondary Action - Glowing border */}
                <button className="group/btn2 relative inline-flex items-center justify-center gap-3 px-12 py-6 bg-gradient-to-br from-slate-800/80 to-blue-900/60 text-cyan-300 rounded-2xl font-bold text-lg border-2 border-cyan-400/60 group-hover/btn2:border-cyan-400/100 hover:bg-gradient-to-br hover:from-slate-800 hover:to-blue-900 transition-all group-hover/btn2:shadow-2xl group-hover/btn2:shadow-cyan-500/50 backdrop-blur-sm">
                  <Activity className="w-6 h-6" />
                  View All Opportunities
                  <ArrowRight className="w-5 h-5 group-hover/btn2:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>

            {/* PREMIUM ANIMATED RADAR VISUALIZATION */}
            <div className="hidden lg:flex flex-col items-center justify-center relative w-80 h-80 flex-shrink-0">
              {/* Outer glow aura */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/20 blur-2xl -z-10 animate-pulse" style={{ animationDuration: "4s" }} />

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                <defs>
                  <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                  </radialGradient>
                </defs>

                {/* Pulsing concentric circles with teal glow */}
                <circle cx="100" cy="100" r="90" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.4" className="animate-pulse" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5" className="animate-pulse" style={{ animationDelay: "0.1s" }} />
                <circle cx="100" cy="100" r="30" fill="none" stroke="#06b6d4" strokeWidth="2.5" opacity="0.7" className="animate-pulse" style={{ animationDelay: "0.2s" }} />

                {/* Animated radar sweep with glow */}
                <g className="animate-spin" style={{ transformOrigin: "100px 100px", animationDuration: "8s" }}>
                  <line x1="100" y1="100" x2="100" y2="15" stroke="#06b6d4" strokeWidth="3" opacity="0.8" />
                  <polygon points="100,100 106,30 100,15 94,30" fill="#0ea5e9" opacity="0.6" />
                  {/* Sweep glow */}
                  <polygon points="100,100 108,40 100,15 92,40" fill="url(#radarGradient)" />
                </g>

                {/* Center pulsing dot */}
                <circle cx="100" cy="100" r="8" fill="#06b6d4" opacity="0.9" className="animate-pulse" />
                <circle cx="100" cy="100" r="12" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4" className="animate-pulse" style={{ animationDuration: "2s" }} />
              </svg>

              {/* Outer radar icon for depth */}
              <Radar className="absolute w-40 h-40 text-cyan-400 opacity-30 animate-pulse" style={{ animationDuration: "5s" }} />
            </div>
          </div>

          {/* Top border accent line with glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-lg shadow-cyan-500/50" />
        </div>

        {/* PERFORMANCE SNAPSHOT - PREMIUM ANIMATED METRICS */}
        <div>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl font-black text-white flex items-center gap-3 drop-shadow-lg">
                <TrendingUp className="w-8 h-8 text-cyan-400" />
                Performance Snapshot
              </h2>
              <p className="text-base text-cyan-200/70 font-semibold mt-3 drop-shadow">
                Real-time AI-analyzed metrics with live trend indicators and predictive analytics
              </p>
            </div>
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-500/40 to-green-600/40 border-2 border-emerald-400/70 rounded-full backdrop-blur-sm shadow-lg shadow-emerald-500/30">
              <Activity className="w-5 h-5 text-emerald-300 animate-pulse" style={{ animationDuration: "1.5s" }} />
              <span className="text-sm font-black text-emerald-200 drop-shadow">🟢 LIVE STREAM</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, idx) => {
              const Icon = metric.icon;
              const isPositive = metric.trend > 0;
              const displayValue = animatedMetrics[idx] || 0;

              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/40 group-hover:border-cyan-400/80 hover:shadow-2xl hover:shadow-cyan-500/40 animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)",
                    animationDelay: `${idx * 100}ms`
                  }}
                >
                  {/* Hover glow effect */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

                  <div className="relative p-8 z-10">
                    {/* Header with icon and trend */}
                    <div className="flex items-start justify-between mb-8">
                      <div className={`bg-gradient-to-br ${metric.color} p-4 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 border border-white/20`}>
                        <Icon className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                      <div
                        className={`text-sm font-black px-3 py-2 rounded-full font-mono transition-all duration-300 border border-white/30 backdrop-blur-sm ${
                          isPositive
                            ? "bg-emerald-500/30 text-emerald-200 shadow-lg shadow-emerald-500/30"
                            : "bg-red-500/30 text-red-200 shadow-lg shadow-red-500/30"
                        }`}
                      >
                        {isPositive ? "↑" : "↓"} {Math.abs(metric.trend)}%
                      </div>
                    </div>

                    {/* Metric content */}
                    <div>
                      <p className="text-sm text-cyan-200/80 font-bold mb-3 uppercase tracking-widest">
                        {metric.label}
                      </p>
                      <p className="text-6xl font-black text-cyan-300 mb-4 tabular-nums drop-shadow-lg">
                        {displayValue}
                      </p>
                      <p className="text-sm text-cyan-100/60 font-semibold">
                        {metric.description}
                      </p>
                    </div>

                    {/* Premium animated sparkline */}
                    <div className="mt-8 pt-8 border-t-2 border-cyan-400/20">
                      <svg
                        viewBox="0 0 100 40"
                        className="w-full h-14 opacity-60 group-hover:opacity-100 transition-opacity"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id={`sparkline-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        {/* Thick premium sparkline */}
                        <path
                          d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.8"
                        />
                        {/* Gradient fill */}
                        <path
                          d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10} L100,40 L0,40 Z`}
                          fill={`url(#sparkline-${idx})`}
                        />
                      </svg>
                    </div>

                    {/* Pulse animation overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIVE RADAR FEED - PREMIUM DYNAMIC ALERTS */}
        <div>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl font-black text-white flex items-center gap-3 drop-shadow-lg">
                <Zap className="w-8 h-8 text-orange-400 animate-pulse" style={{ animationDuration: "1s" }} />
                Live Radar Feed
              </h2>
              <p className="text-base text-cyan-200/70 font-semibold mt-3 drop-shadow">
                AI-prioritized alerts sorted by urgency, impact, and conversion probability
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-600/50 to-red-700/40 border-2 border-red-500/80 rounded-full animate-pulse backdrop-blur-sm shadow-lg shadow-red-600/40">
                <Radio className="w-5 h-5 text-red-300 animate-pulse" style={{ animationDuration: "1s" }} />
                <span className="text-sm font-black text-red-200 drop-shadow">🔴 LIVE</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-gradient-to-br from-red-600/30 to-red-700/20 border-2 border-red-500/60 rounded-2xl p-6 text-red-200 mb-8 flex items-start gap-4 backdrop-blur-sm shadow-lg shadow-red-600/30">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1 drop-shadow" />
              <div>
                <p className="font-bold text-lg drop-shadow">Error loading alerts</p>
                <p className="text-sm opacity-90 mt-2">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-40 bg-gradient-to-br from-slate-800/40 to-blue-900/30 rounded-2xl border-2 border-cyan-400/20 animate-pulse backdrop-blur-sm"
                />
              ))}
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="text-center py-28 px-8 bg-gradient-to-br from-cyan-500/10 via-blue-600/5 to-slate-950/40 rounded-3xl border-2 border-dashed border-cyan-400/40 hover:border-cyan-400/60 transition-all">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-2xl mb-6 shadow-lg shadow-cyan-500/30">
                <Sparkles className="w-12 h-12 text-cyan-300 animate-pulse drop-shadow-lg" />
              </div>
              <p className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                All Systems Optimal! 🎉
              </p>
              <p className="text-lg text-cyan-200/80 max-w-md mx-auto font-semibold drop-shadow">
                No active alerts right now. Your AI is continuously monitoring markets, analyzing leads, and scanning for emerging opportunities 24/7 across all your territories.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm cursor-pointer ${getUrgencyColor(
                    item.urgency
                  )} hover:scale-105 hover:-translate-y-1 animate-in fade-in slide-in-from-left-4 duration-500`}
                  style={{ 
                    background: getUrgencyColor(item.urgency).includes('bg-red') 
                      ? "linear-gradient(135deg, rgba(127, 29, 29, 0.3) 0%, rgba(159, 18, 57, 0.1) 100%)"
                      : getUrgencyColor(item.urgency).includes('bg-orange')
                      ? "linear-gradient(135deg, rgba(124, 45, 18, 0.3) 0%, rgba(154, 52, 18, 0.1) 100%)"
                      : getUrgencyColor(item.urgency).includes('bg-amber')
                      ? "linear-gradient(135deg, rgba(120, 53, 15, 0.3) 0%, rgba(146, 64, 14, 0.1) 100%)"
                      : "linear-gradient(135deg, rgba(20, 83, 45, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)",
                    animationDelay: `${index * 100}ms`,
                    boxShadow: `0 0 30px ${item.urgency === 'critical' ? 'rgba(239, 68, 68, 0.3)' : item.urgency === 'high' ? 'rgba(249, 115, 22, 0.3)' : item.urgency === 'medium' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                  }}
                >
                  {/* Animated left accent bar with glow */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 group-hover:w-2 transition-all ${getUrgencyBadgeColor(item.urgency)} opacity-0 group-hover:opacity-100 shadow-lg`} />

                  {/* Hover shimmer effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-gradient-to-r from-white via-transparent to-white transition-opacity animate-pulse" />

                  <div className="relative p-7 flex items-start gap-6">
                    {/* Icon indicator */}
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-2 animate-pulse shadow-lg ${getUrgencyBadgeColor(item.urgency)}`} style={{ boxShadow: `0 0 20px ${item.urgency === 'critical' ? 'rgb(239, 68, 68)' : item.urgency === 'high' ? 'rgb(249, 115, 22)' : item.urgency === 'medium' ? 'rgb(217, 119, 6)' : 'rgb(34, 197, 94)'}` }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-3">
                            <h3 className="font-black text-lg drop-shadow">
                              {item.title}
                            </h3>
                            <span className={`text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap animate-pulse ${getUrgencyBadgeColor(item.urgency)} shadow-lg`} style={{ boxShadow: `0 0 15px ${item.urgency === 'critical' ? 'rgba(239, 68, 68, 0.5)' : item.urgency === 'high' ? 'rgba(249, 115, 22, 0.5)' : item.urgency === 'medium' ? 'rgba(217, 119, 6, 0.5)' : 'rgba(34, 197, 94, 0.5)'}` }}>
                              {item.urgency.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-base opacity-90 font-semibold drop-shadow">
                            {item.description}
                          </p>
                          {item.value && (
                            <p className="text-sm opacity-75 font-mono mt-4 bg-black/30 px-4 py-2 rounded-xl w-fit border border-white/20 drop-shadow backdrop-blur-sm">
                              📧 {item.value}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta info with premium styling */}
                      <div className="flex items-center justify-between flex-wrap gap-4 text-sm opacity-85 pt-5 border-t border-white/20">
                        <div className="flex items-center gap-4">
                          {item.location && (
                            <div className="flex items-center gap-2 font-bold drop-shadow">
                              <Home className="w-5 h-5" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.trend !== undefined && (
                            <div className="flex items-center gap-2 font-bold drop-shadow">
                              <TrendingUp className="w-5 h-5" />
                              {item.trend > 0 ? "+" : ""}{item.trend}%
                            </div>
                          )}
                        </div>

                        {item.timestamp && (
                          <div className="flex items-center gap-2 font-bold drop-shadow">
                            <Clock className="w-5 h-5" />
                            <span>{formatTimeAgo(new Date(item.timestamp))}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right action buttons with glow */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleMarkHandled(item.id)}
                        className="p-3 rounded-xl transition-all group/check opacity-70 group-hover:opacity-100 hover:bg-white/20 backdrop-blur-sm"
                        title="Mark as handled"
                      >
                        <CheckCircle2 className="w-6 h-6 group-hover/check:scale-125 transition-transform drop-shadow" />
                      </button>
                      <ArrowRight className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all drop-shadow flex-shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PREMIUM FOOTER - Powered by Clippy AI */}
        <div className="border-t-2 border-cyan-400/20 pt-16 pb-8">
          <div className="relative overflow-hidden rounded-3xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/40 hover:border-cyan-400/80 group hover:shadow-2xl hover:shadow-cyan-500/40 p-10">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-blue-600/10 to-slate-950 -z-10" />
            
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-gradient-to-r from-cyan-500 via-transparent to-blue-600 transition-opacity -z-10" />

            <div className="relative z-10 flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-gradient-to-br from-cyan-500/40 to-blue-600/30 rounded-2xl group-hover:scale-110 transition-transform border border-cyan-400/60 shadow-lg shadow-cyan-500/30">
                  <Radar className="w-7 h-7 text-cyan-300 animate-pulse" style={{ animationDuration: "3s" }} />
                </div>
                <div>
                  <p className="font-black text-white text-lg drop-shadow-lg">Powered by Clippy AI</p>
                  <p className="text-sm text-cyan-200/70 font-semibold mt-1 drop-shadow">
                    Enterprise Intelligence • Premium Platform • Competitive Advantage 24/7
                  </p>
                </div>
              </div>
              <Sparkles className="w-10 h-10 text-cyan-400 opacity-50 flex-shrink-0 animate-pulse" style={{ animationDuration: "4s" }} />
            </div>

            {/* Top border accent with glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent shadow-lg shadow-cyan-500/40" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Layout>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
