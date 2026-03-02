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
  Flame,
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
}

interface MetricCard {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: number;
  description: string;
}

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
        const { data } = await supabase
          .from("user_org_roles")
          .select("org_id")
          .eq("user_id", userId)
          .single();

        setUserOrgId(data?.org_id || "default");
      } catch (err) {
        setUserOrgId("default");
      }
    };
    fetchUserOrgId();
  }, [navigate]);

  const fetchRadarItems = async () => {
    if (!userOrgId) return;

    setLoading(true);

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
      {/* DEEP NAVY BACKGROUND */}
      <div className="fixed inset-0 -z-30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />

      {/* ANIMATED GRADIENT ORBS */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-gradient-to-tl from-cyan-500/10 to-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* ANIMATED RADAR GRID BACKGROUND */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-[0.12] animate-pulse" preserveAspectRatio="none" style={{ animationDuration: "6s" }}>
          <defs>
            <pattern id="radar-grid" x="50" y="50" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="25" fill="none" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
              <circle cx="25" cy="25" r="15" fill="none" stroke="#0ea5e9" strokeWidth="0.6" opacity="0.5" />
              <circle cx="25" cy="25" r="5" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.8" />
              <line x1="0" y1="25" x2="50" y2="25" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" />
              <line x1="25" y1="0" x2="25" y2="50" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" />
              <circle cx="25" cy="25" r="2" fill="#0ea5e9" opacity="0.9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-grid)" />
        </svg>
        {/* Additional pulsing grid overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-pulse" style={{ animationDuration: "8s" }} />
      </div>

      {/* FLOATING AI SUGGESTS BAR - Responsive positioning */}
      {hotLeadsCount > 0 && (
        <div className="fixed bottom-4 right-4 md:bottom-auto md:top-32 md:right-8 max-w-xs md:max-w-sm z-50 animate-in slide-in-from-right-8 duration-700">
          <div className="relative group cursor-pointer">
            {/* Multiple layered glows */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/60 via-blue-500/60 to-cyan-500/60 rounded-3xl blur-3xl opacity-80 group-hover:opacity-100 animate-pulse transition-opacity" style={{ animationDuration: "2.5s" }} />
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/40 via-blue-400/30 to-cyan-400/40 rounded-3xl blur-2xl opacity-60 animate-pulse transition-opacity" style={{ animationDuration: "4s" }} />

            <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 rounded-3xl p-4 md:p-6 border-2 border-cyan-400/80 group-hover:border-cyan-200 shadow-3xl shadow-cyan-500/50 group-hover:shadow-cyan-400/70 transition-all duration-300 backdrop-blur-xl active:scale-95">
              <div className="flex items-center justify-between gap-3 md:gap-4">
                <div className="flex items-start gap-2 md:gap-3 flex-1">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-cyan-400/50 to-blue-500/50 rounded-2xl mt-0.5 animate-pulse border-2 border-cyan-300/80 shadow-lg shadow-cyan-400/40 flex-shrink-0">
                    <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-cyan-100 drop-shadow-lg" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-cyan-200 uppercase tracking-widest drop-shadow-lg">
                      🎯 AI SUGGESTS
                    </p>
                    <p className="text-sm md:text-base font-black text-white mt-1 md:mt-2 drop-shadow-lg line-clamp-2">
                      Follow up with {hotLeadsCount} hot {hotLeadsCount === 1 ? "lead" : "leads"}
                    </p>
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-cyan-200 group-hover:translate-x-3 group-active:translate-x-1 transition-transform drop-shadow-lg font-black" />
                </div>
              </div>

              {/* Animated shimmer effect */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-0 group-hover:opacity-40">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" style={{ animationDuration: "3s" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 relative z-10 px-3 md:px-4">
        {/* PREMIUM HEADER - Responsive */}
        <div className="pt-4 md:pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="p-3 md:p-4 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-2xl relative group border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/30 flex-shrink-0">
                <Radar className="w-6 h-6 md:w-8 md:h-8 text-cyan-300 animate-pulse drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                  AI Radar
                </h1>
                <p className="text-xs sm:text-sm text-cyan-200/80 font-semibold mt-1 md:mt-2 drop-shadow">
                  Real-Time Intelligence Platform
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 md:p-4 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/50 hover:to-blue-600/50 text-cyan-300 transition-all group disabled:opacity-50 hover:shadow-2xl hover:shadow-cyan-500/40 border-2 border-cyan-400/60 backdrop-blur-sm flex-shrink-0"
            title="Refresh AI Radar"
          >
            <RefreshCw
              className={`w-5 h-5 md:w-6 md:h-6 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
            />
          </button>
        </div>

        {/* MASSIVE HERO SECTION - Responsive Layout */}
        <div className="relative overflow-hidden rounded-3xl group">
          <div className="absolute inset-0 -z-10">
            {/* Hide desktop-sized gradient orbs on mobile, scale down on tablet */}
            <div className="hidden md:block">
              <div className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full border-3 border-cyan-400/40 -translate-y-1/2 animate-spin shadow-2xl shadow-cyan-500/30" style={{ animationDuration: "25s" }} />
              <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full border-2 border-cyan-400/30 -translate-y-1/2 animate-spin shadow-xl shadow-cyan-500/20" style={{ animationDuration: "18s", animationDirection: "reverse" }} />
              <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full border-2 border-cyan-400/20 -translate-y-1/2 animate-pulse shadow-lg shadow-cyan-500/15" style={{ animationDuration: "5s" }} />
            </div>

            {/* Smaller mobile gradient orbs */}
            <div className="md:hidden">
              <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full border-2 border-cyan-400/30 -translate-y-1/2 animate-spin shadow-lg shadow-cyan-500/20" style={{ animationDuration: "25s" }} />
              <div className="absolute top-1/2 right-1/3 w-24 h-24 rounded-full border-2 border-cyan-400/20 -translate-y-1/2 animate-pulse shadow-md shadow-cyan-500/10" style={{ animationDuration: "5s" }} />
            </div>

            <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full blur-3xl animate-pulse shadow-2xl shadow-cyan-500/40" style={{ animationDuration: "7s" }} />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/25 to-cyan-600/15 rounded-full blur-3xl shadow-2xl shadow-blue-500/30" style={{ animationDuration: "8s", animationDelay: "1s" }} />
            <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: "9s" }} />
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-600/2 to-slate-950/40 -z-10" />
          <div className="absolute inset-0 rounded-3xl border-2 border-cyan-400/50 group-hover:border-cyan-300 transition-all duration-500 -z-10 shadow-2xl shadow-cyan-500/40 group-hover:shadow-cyan-500/60" />
          <div className="absolute -top-0.5 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent rounded-full shadow-lg shadow-cyan-500/60 group-hover:shadow-cyan-400/80 transition-shadow duration-300" />

          <div className="relative z-10 p-6 md:p-12 lg:p-16 flex flex-col md:flex-row items-start justify-between gap-6 md:gap-12">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-8">
                <div className="inline-flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 rounded-full border-2 border-cyan-400/60 group-hover:border-cyan-400/80 transition-all backdrop-blur-sm group-hover:shadow-lg group-hover:shadow-cyan-500/40">
                  <Radio className="w-4 h-4 md:w-5 md:h-5 text-cyan-300 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-black text-cyan-200 uppercase tracking-widest drop-shadow">
                    🚨 Live AI
                  </span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 md:mb-6 leading-tight drop-shadow-lg">
                {radarItems.length > 0
                  ? `${criticalCount} ${criticalCount === 1 ? "Opportunity" : "Opportunities"}`
                  : "AI Intelligence 24/7"}
              </h2>

              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-cyan-100/90 mb-6 md:mb-12 max-w-2xl leading-relaxed font-semibold drop-shadow">
                {radarItems.length > 0
                  ? `${hotLeadsCount} hot leads, ${activeAlerts.filter((i) => i.type === "market_alert").length} market opportunities detected.`
                  : "Enterprise-grade market intelligence powered by AI."}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-5 w-full sm:w-auto">
                <button className="group/btn relative inline-flex items-center justify-center gap-2 md:gap-3 px-6 md:px-12 py-3 md:py-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 text-slate-900 rounded-xl md:rounded-2xl font-black text-sm md:text-base lg:text-lg transition-all duration-300 hover:shadow-3xl hover:shadow-cyan-500/80 hover:scale-105 md:hover:scale-110 active:scale-95 border-2 border-cyan-300/80 group-hover/btn:border-cyan-100 group-active/btn:border-cyan-400 flex-1 sm:flex-none touch-manipulation">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/60 to-blue-500/60 rounded-xl md:rounded-2xl blur-xl opacity-60 group-hover/btn:opacity-100 -z-10 animate-pulse" style={{ animationDuration: "1.5s" }} />
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/40 via-blue-400/30 to-cyan-400/40 rounded-xl md:rounded-2xl blur-lg opacity-40 -z-10 animate-pulse" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
                  <Target className="w-5 h-5 md:w-6 md:h-6 group-hover/btn:rotate-12 group-active/btn:scale-90 transition-all" />
                  <span className="hidden sm:inline">Take Action</span>
                  <span className="sm:hidden">Action</span>
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:translate-x-2 group-active/btn:translate-x-0 transition-transform" />
                </button>

                <button className="group/btn2 relative inline-flex items-center justify-center gap-2 md:gap-3 px-6 md:px-12 py-3 md:py-6 bg-gradient-to-br from-slate-800/90 to-blue-900/70 text-cyan-300 rounded-xl md:rounded-2xl font-bold text-sm md:text-base lg:text-lg border-2 border-cyan-400/70 group-hover/btn2:border-cyan-300/100 hover:bg-gradient-to-br hover:from-slate-700 hover:to-blue-800 transition-all group-hover/btn2:shadow-3xl group-hover/btn2:shadow-cyan-500/60 group-active/btn2:scale-95 backdrop-blur-sm flex-1 sm:flex-none touch-manipulation">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-xl md:rounded-2xl blur-xl opacity-0 group-hover/btn2:opacity-50 -z-10 transition-opacity" />
                  <Activity className="w-5 h-5 md:w-6 md:h-6 group-hover/btn2:scale-110 group-active/btn2:scale-90 transition-transform" />
                  <span className="hidden sm:inline">View All</span>
                  <span className="sm:hidden">View</span>
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover/btn2:translate-x-2 group-active/btn2:translate-x-0 transition-transform" />
                </button>
              </div>
            </div>

            {/* PREMIUM RADAR VISUALIZATION - Hidden on mobile, smaller on tablet */}
            <div className="hidden md:flex flex-col items-center justify-center relative w-40 h-40 lg:w-80 lg:h-80 flex-shrink-0 group mx-auto md:mx-0 mt-6 md:mt-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/20 blur-2xl -z-10 animate-pulse" style={{ animationDuration: "4s" }} />

              {/* Shimmer overlay effect */}
              <div className="absolute inset-0 rounded-full overflow-hidden -z-5 opacity-0 group-hover:opacity-30 animate-pulse" style={{ animationDuration: "3s" }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDuration: "2s" }} />
              </div>

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#0284c7" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
                  </radialGradient>
                  <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Static concentric circles */}
                <circle cx="100" cy="100" r="90" fill="none" stroke="#06b6d4" strokeWidth="2.5" opacity="0.5" className="animate-pulse" style={{ animationDuration: "4s" }} />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#0ea5e9" strokeWidth="2" opacity="0.6" className="animate-pulse" style={{ animationDelay: "0.15s", animationDuration: "4s" }} />
                <circle cx="100" cy="100" r="30" fill="none" stroke="#06b6d4" strokeWidth="2.5" opacity="0.8" className="animate-pulse" style={{ animationDelay: "0.3s", animationDuration: "4s" }} />

                {/* Pulsing center target */}
                <circle cx="100" cy="100" r="12" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.6" className="animate-pulse" style={{ animationDuration: "2s" }} />
                <circle cx="100" cy="100" r="6" fill="none" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.8" className="animate-pulse" style={{ animationDuration: "1.5s", animationDelay: "0.2s" }} />
                <circle cx="100" cy="100" r="3" fill="#06b6d4" opacity="1" className="animate-pulse" style={{ animationDuration: "1s" }} />

                {/* Fast sweeping radar line with glow */}
                <g className="animate-spin" style={{ transformOrigin: "100px 100px", animationDuration: "6s", animationTimingFunction: "linear" }}>
                  <line x1="100" y1="100" x2="100" y2="10" stroke="#06b6d4" strokeWidth="4" opacity="0.9" filter="url(#glow)" />
                  <line x1="100" y1="100" x2="100" y2="8" stroke="#0ea5e9" strokeWidth="2" opacity="0.7" />
                  <polygon points="100,100 106,22 100,8 94,22" fill="url(#sweepGradient)" filter="url(#glow)" />
                </g>

                {/* Counter-rotating sweep for depth */}
                <g className="animate-spin" style={{ transformOrigin: "100px 100px", animationDuration: "9s", animationTimingFunction: "linear", animationDirection: "reverse", opacity: 0.4 }}>
                  <line x1="100" y1="100" x2="100" y2="10" stroke="#0284c7" strokeWidth="3" opacity="0.5" />
                </g>
              </svg>

              <Radar className="absolute w-16 h-16 lg:w-40 lg:h-40 text-cyan-400 opacity-30 animate-pulse" style={{ animationDuration: "5s" }} />
            </div>
          </div>

          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-lg shadow-cyan-500/50" />
        </div>

        {/* PERFORMANCE SNAPSHOT - Responsive */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-0 mb-6 md:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white flex items-center gap-2 md:gap-3 drop-shadow-lg">
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-cyan-400 flex-shrink-0" />
                <span>Performance</span>
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-cyan-200/70 font-semibold mt-2 md:mt-3 drop-shadow">
                Real-time metrics with AI trend indicators
              </p>
            </div>
            <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-emerald-500/40 to-green-600/40 border-2 border-emerald-400/70 rounded-full backdrop-blur-sm shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-300 animate-pulse" style={{ animationDuration: "1.5s" }} />
              <span className="text-xs md:text-sm font-black text-emerald-200 drop-shadow">🟢 LIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {metrics.map((metric, idx) => {
              const Icon = metric.icon;
              const isPositive = metric.trend > 0;
              const displayValue = animatedMetrics[idx] || 0;

              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/60 hover:-translate-y-1 md:hover:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500 touch-manipulation"
                  style={{
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)",
                    animationDelay: `${idx * 100}ms`,
                    boxShadow: "0 0 20px rgba(6, 182, 212, 0.2)"
                  }}
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

                  <div className="relative p-4 md:p-8 z-10">
                    <div className="flex items-start justify-between mb-4 md:mb-8">
                      <div className={`bg-gradient-to-br ${metric.color} p-2.5 md:p-4 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 border border-white/20 flex-shrink-0`}>
                        <Icon className="w-5 h-5 md:w-8 md:h-8 text-white drop-shadow-lg" />
                      </div>
                      <div
                        className={`text-xs md:text-sm font-black px-2 md:px-3 py-1 md:py-2 rounded-full font-mono transition-all duration-300 border border-white/30 backdrop-blur-sm whitespace-nowrap ${
                          isPositive
                            ? "bg-emerald-500/30 text-emerald-200 shadow-lg shadow-emerald-500/30"
                            : "bg-red-500/30 text-red-200 shadow-lg shadow-red-500/30"
                        }`}
                      >
                        {isPositive ? "↑" : "↓"} {Math.abs(metric.trend)}%
                      </div>
                    </div>

                    <div>
                      <p className="text-xs md:text-sm text-cyan-200/80 font-bold mb-2 md:mb-3 uppercase tracking-widest">
                        {metric.label}
                      </p>
                      <p className="text-4xl md:text-6xl font-black text-cyan-300 mb-2 md:mb-4 tabular-nums drop-shadow-lg">
                        {displayValue}
                      </p>
                      <p className="text-xs md:text-sm text-cyan-100/60 font-semibold line-clamp-2">
                        {metric.description}
                      </p>
                    </div>

                    <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t-2 border-cyan-400/30 group-hover:border-cyan-400/60 transition-colors duration-300">
                      <svg
                        viewBox="0 0 100 40"
                        className="w-full h-10 md:h-16 opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"
                        preserveAspectRatio="none"
                        style={{ animationDuration: "3s" }}
                      >
                        <defs>
                          <linearGradient id={`sparkline-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                          </linearGradient>
                          <filter id={`glow-sparkline-${idx}`}>
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Glowing line */}
                        <path
                          d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.6"
                          filter={`url(#glow-sparkline-${idx})`}
                        />

                        {/* Main bright line */}
                        <path
                          d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.9"
                        />

                        {/* Gradient fill */}
                        <path
                          d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10} L100,40 L0,40 Z`}
                          fill={`url(#sparkline-${idx})`}
                          opacity="0.7"
                        />
                      </svg>
                    </div>

                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIVE RADAR FEED - Responsive */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-0 mb-6 md:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white flex items-center gap-2 md:gap-3 drop-shadow-lg">
                <div className="p-1.5 md:p-2 bg-gradient-to-br from-orange-500/50 to-red-600/40 rounded-lg border border-orange-400/80 shadow-lg shadow-orange-500/40 flex-shrink-0">
                  <Zap className="w-5 h-5 md:w-6 md:h-6 text-orange-200 animate-pulse" style={{ animationDuration: "1.2s" }} />
                </div>
                Live Feed
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-cyan-200/70 font-semibold mt-2 md:mt-3 drop-shadow">
                AI-prioritized alerts by urgency
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600/60 to-red-500/60 rounded-full blur-lg opacity-70 animate-pulse" style={{ animationDuration: "1.5s" }} />
                <div className="relative flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-red-600/70 to-red-700/60 border-2 border-red-400/90 rounded-full animate-pulse backdrop-blur-sm shadow-2xl shadow-red-600/50" style={{ animationDuration: "2s" }}>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-300 animate-pulse shadow-lg shadow-red-400" style={{ animationDuration: "1s" }} />
                  <span className="text-xs md:text-sm font-black text-red-100 drop-shadow">🔴 LIVE</span>
                </div>
              </div>
            </div>
          </div>

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
                No active alerts right now. Your AI is continuously monitoring markets, analyzing leads, and scanning for emerging opportunities 24/7.
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {activeAlerts.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm cursor-pointer active:scale-95 ${getUrgencyColor(
                    item.urgency
                  )} hover:md:scale-105 hover:md:-translate-y-3 hover:z-20 animate-in fade-in slide-in-from-left-4 duration-500 touch-manipulation`}
                  style={{
                    background: getUrgencyColor(item.urgency).includes('bg-red')
                      ? "linear-gradient(135deg, rgba(127, 29, 29, 0.4) 0%, rgba(159, 18, 57, 0.15) 100%)"
                      : getUrgencyColor(item.urgency).includes('bg-orange')
                      ? "linear-gradient(135deg, rgba(124, 45, 18, 0.4) 0%, rgba(154, 52, 18, 0.15) 100%)"
                      : getUrgencyColor(item.urgency).includes('bg-amber')
                      ? "linear-gradient(135deg, rgba(120, 53, 15, 0.4) 0%, rgba(146, 64, 14, 0.15) 100%)"
                      : "linear-gradient(135deg, rgba(20, 83, 45, 0.4) 0%, rgba(34, 197, 94, 0.15) 100%)",
                    animationDelay: `${index * 100}ms`,
                    boxShadow: item.urgency === 'critical'
                      ? `0 0 40px rgba(239, 68, 68, 0.4), 0 20px 40px rgba(239, 68, 68, 0.15)`
                      : item.urgency === 'high'
                      ? `0 0 40px rgba(249, 115, 22, 0.4), 0 20px 40px rgba(249, 115, 22, 0.15)`
                      : item.urgency === 'medium'
                      ? `0 0 40px rgba(217, 119, 6, 0.4), 0 20px 40px rgba(217, 119, 6, 0.15)`
                      : `0 0 40px rgba(34, 197, 94, 0.4), 0 20px 40px rgba(34, 197, 94, 0.15)`
                  }}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 group-hover:w-2 transition-all ${getUrgencyBadgeColor(item.urgency)} opacity-0 group-hover:opacity-100 shadow-lg`} />

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-gradient-to-r from-white via-transparent to-white transition-opacity animate-pulse" />

                  <div className="relative p-4 md:p-7 flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 md:mt-2 animate-pulse shadow-lg ${getUrgencyBadgeColor(item.urgency)}`} style={{ boxShadow: `0 0 20px ${item.urgency === 'critical' ? 'rgb(239, 68, 68)' : item.urgency === 'high' ? 'rgb(249, 115, 22)' : item.urgency === 'medium' ? 'rgb(217, 119, 6)' : 'rgb(34, 197, 94)'}` }} />

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-3 md:gap-4 mb-3 md:mb-5 flex-col sm:flex-row">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 md:gap-3 flex-wrap mb-2 md:mb-3">
                            <h3 className="font-black text-base md:text-lg drop-shadow">
                              {item.title}
                            </h3>
                            <span className={`text-xs font-black px-2.5 md:px-4 py-1 md:py-1.5 rounded-full whitespace-nowrap animate-pulse ${getUrgencyBadgeColor(item.urgency)} shadow-lg`} style={{ boxShadow: `0 0 15px ${item.urgency === 'critical' ? 'rgba(239, 68, 68, 0.5)' : item.urgency === 'high' ? 'rgba(249, 115, 22, 0.5)' : item.urgency === 'medium' ? 'rgba(217, 119, 6, 0.5)' : 'rgba(34, 197, 94, 0.5)'}` }}>
                              {item.urgency.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm md:text-base opacity-90 font-semibold drop-shadow">
                            {item.description}
                          </p>
                          {item.value && (
                            <p className="text-xs md:text-sm opacity-75 font-mono mt-2 md:mt-4 bg-black/30 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl w-fit border border-white/20 drop-shadow backdrop-blur-sm">
                              📧 {item.value}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between flex-wrap gap-2 md:gap-4 text-xs md:text-sm opacity-85 pt-3 md:pt-5 border-t border-white/20 w-full">
                        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                          {item.location && (
                            <div className="flex items-center gap-1.5 md:gap-2 font-bold drop-shadow">
                              <Home className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                          {item.trend !== undefined && (
                            <div className="flex items-center gap-1.5 md:gap-2 font-bold drop-shadow">
                              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                              {item.trend > 0 ? "+" : ""}{item.trend}%
                            </div>
                          )}
                        </div>

                        {item.timestamp && (
                          <div className="flex items-center gap-1.5 md:gap-2 font-bold drop-shadow whitespace-nowrap">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                            <span>{formatTimeAgo(new Date(item.timestamp))}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleMarkHandled(item.id)}
                        className="p-2 md:p-3 rounded-xl transition-all group/check opacity-70 group-hover:opacity-100 hover:bg-white/20 backdrop-blur-sm flex-shrink-0"
                        title="Mark as handled"
                      >
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 group-hover/check:scale-125 transition-transform drop-shadow" />
                      </button>
                      <ArrowRight className="w-5 h-5 md:w-6 md:h-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all drop-shadow flex-shrink-0 hidden md:block" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PREMIUM FOOTER - Responsive */}
        <div className="border-t-2 border-cyan-400/30 pt-8 md:pt-16 pb-4 md:pb-8">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/60 hover:border-cyan-300 group hover:shadow-3xl hover:shadow-cyan-500/50 p-5 md:p-10">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/40 via-blue-500/30 to-cyan-500/40 rounded-2xl md:rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 -z-10 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-600/15 to-slate-950 -z-10" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-40 bg-gradient-to-r from-cyan-500 via-transparent to-blue-600 transition-opacity animate-pulse -z-10" style={{ animationDuration: "4s" }} />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-5 flex-1">
                <div className="p-3 md:p-4 bg-gradient-to-br from-cyan-500/40 to-blue-600/30 rounded-2xl group-hover:scale-110 transition-transform border border-cyan-400/60 shadow-lg shadow-cyan-500/30 flex-shrink-0">
                  <Radar className="w-5 h-5 md:w-7 md:h-7 text-cyan-300 animate-pulse" style={{ animationDuration: "3s" }} />
                </div>
                <div>
                  <p className="font-black text-white text-base md:text-lg drop-shadow-lg">Clippy AI</p>
                  <p className="text-xs md:text-sm text-cyan-200/70 font-semibold mt-0.5 md:mt-1 drop-shadow line-clamp-2">
                    Enterprise Intelligence • Premium • 24/7
                  </p>
                </div>
              </div>
              <Sparkles className="w-7 h-7 md:w-10 md:h-10 text-cyan-400 opacity-50 flex-shrink-0 animate-pulse" style={{ animationDuration: "4s" }} />
            </div>

            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent shadow-lg shadow-cyan-500/40" />
          </div>
        </div>
      </div>
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
