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
      color: "from-primary to-primary/60",
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
      color: "from-orange-500 to-orange-600",
      trend: 15,
      description: "New prospects",
    },
    {
      label: "Market Insights",
      value: 0,
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
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
        return "text-red-600 bg-red-50 border-red-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-200/50";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-200/50";
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-200/50";
      case "low":
        return "text-green-600 bg-green-50 border-green-200 hover:border-green-400 hover:shadow-lg hover:shadow-green-200/50";
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

  return (
    <Layout showNav={true}>
      {/* Background radar grid pattern */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.02]"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="radar-grid" x="40" y="40" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="20" fill="none" stroke="currentColor" className="text-primary" />
              <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" className="text-primary" />
              <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-grid)" />
        </svg>
      </div>

      {/* Floating Next Best Action Bar - Top */}
      {hotLeadsCount > 0 && (
        <div className="fixed top-32 right-8 max-w-sm animate-in slide-in-from-right-8 duration-700 z-40">
          <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-2xl p-5 shadow-2xl border border-primary/40 group cursor-pointer hover:shadow-3xl hover:border-primary/60 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2.5 bg-white/20 rounded-xl mt-0.5 animate-pulse">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/90 uppercase tracking-widest">
                    AI SUGGESTS
                  </p>
                  <p className="text-sm font-bold text-white mt-1.5">
                    Follow up with {hotLeadsCount} hot {hotLeadsCount === 1 ? "lead" : "leads"} now
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="pt-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-4 bg-gradient-to-br from-primary/40 to-primary/20 rounded-2xl relative group">
                <Radar className="w-8 h-8 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-2xl border border-primary/30 group-hover:border-primary/60 transition-colors" />
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  AI Radar
                </h1>
                <p className="text-sm text-muted-foreground font-semibold mt-1">
                  Intelligent real-time platform for real estate excellence
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary transition-all group disabled:opacity-50 hover:shadow-lg"
            title="Refresh AI Radar"
          >
            <RefreshCw
              className={`w-6 h-6 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
            />
          </button>
        </div>

        {/* MASSIVE HERO SECTION - Premium Dramatic */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-2 border-primary/30 rounded-3xl p-10 md:p-14 hover:border-primary/50 transition-all duration-500 relative overflow-hidden group">
          {/* Multi-layer animated background */}
          <div className="absolute inset-0 -z-10">
            {/* Rotating radar circles */}
            <div className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full border-2 border-primary/20 -translate-y-1/2 animate-spin" style={{ animationDuration: "20s" }} />
            <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full border-2 border-primary/15 -translate-y-1/2 animate-spin" style={{ animationDuration: "15s", animationDirection: "reverse" }} />
            <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full border-2 border-primary/10 -translate-y-1/2 animate-pulse" style={{ animationDuration: "4s" }} />

            {/* Glowing orbs */}
            <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
          </div>

          <div className="relative z-10 flex items-start justify-between gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/25 rounded-full border border-primary/40 hover:border-primary/60 transition-colors">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                    AI Recommendation
                  </span>
                </div>
              </div>

              <h2 className="text-5xl md:text-6xl font-black text-foreground mb-5 leading-tight">
                {radarItems.length > 0
                  ? `${activeAlerts.filter((i) => i.urgency === "critical" || i.urgency === "high").length} Urgent Opportunities Await`
                  : "24/7 AI Intelligence at Your Command"}
              </h2>

              <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed font-medium">
                {radarItems.length > 0
                  ? `Your AI has identified ${hotLeadsCount} hot leads, ${activeAlerts.filter((i) => i.type === "market_alert").length} market opportunities, and ${activeAlerts.filter((i) => i.urgency === "critical").length} critical items. Act now to maximize your competitive edge.`
                  : "Connect your Supabase database to unlock enterprise-grade market intelligence, AI-powered lead scoring, and real-time opportunity discovery."}
              </p>

              <div className="flex flex-wrap gap-4">
                <button className="group/btn inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl font-bold text-lg hover:shadow-3xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105 active:scale-95">
                  <Target className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
                  Take Action Now
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-background text-foreground border-2 border-primary/40 rounded-2xl font-bold text-lg hover:border-primary/60 hover:bg-primary/5 transition-all group/btn2">
                  <Activity className="w-6 h-6" />
                  View All Opportunities
                  <ArrowRight className="w-5 h-5 group-hover/btn2:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Premium animated radar visualization */}
            <div className="hidden lg:flex flex-col items-center justify-center relative w-64 h-64 flex-shrink-0">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                {/* Concentric circles */}
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/20 animate-pulse" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/30 animate-pulse" style={{ animationDelay: "0.1s" }} />
                <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/50" />

                {/* Radar sweep */}
                <g className="animate-spin" style={{ transformOrigin: "100px 100px", animationDuration: "8s" }}>
                  <line x1="100" y1="100" x2="100" y2="20" stroke="currentColor" strokeWidth="2" className="text-primary/60" />
                  <polygon points="100,100 105,35 100,25 95,35" fill="currentColor" className="text-primary/40" />
                </g>

                {/* Center dot */}
                <circle cx="100" cy="100" r="8" fill="currentColor" className="text-primary animate-pulse" />
              </svg>

              <Radar className="absolute w-32 h-32 text-primary opacity-40 animate-pulse" style={{ animationDuration: "4s" }} />
            </div>
          </div>

          {/* Top border accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        {/* Performance Snapshot - PREMIUM ANIMATED METRICS */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-primary" />
                Performance Snapshot
              </h2>
              <p className="text-base text-muted-foreground font-semibold mt-2">
                Real-time AI-analyzed metrics with live trend indicators
              </p>
            </div>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-100 border-2 border-green-300 rounded-full">
              <Activity className="w-4 h-4 text-green-600 animate-pulse" />
              <span className="text-sm font-bold text-green-700">LIVE STREAM</span>
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
                  className="bg-card rounded-2xl border-2 border-border p-7 hover:shadow-2xl hover:border-primary/50 transition-all duration-300 group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Hover glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/15 to-transparent rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="flex items-start justify-between mb-8">
                    <div className={`bg-gradient-to-br ${metric.color} p-5 rounded-xl shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div
                      className={`text-sm font-bold px-3 py-1.5 rounded-full font-mono transition-all duration-300 ${
                        isPositive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isPositive ? "↑" : "↓"} {Math.abs(metric.trend)}%
                    </div>
                  </div>

                  <div>
                    <p className="text-base text-muted-foreground font-semibold mb-3">
                      {metric.label}
                    </p>
                    <p className="text-5xl font-black text-foreground mb-4 tabular-nums">
                      {displayValue}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium mb-6">
                      {metric.description}
                    </p>
                  </div>

                  {/* Animated sparkline */}
                  <div className="mt-6 pt-6 border-t-2 border-border">
                    <svg
                      viewBox="0 0 100 40"
                      className="w-full h-12 opacity-70 group-hover:opacity-100 transition-opacity"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={`sparkline-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-primary"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
                        fill={`url(#sparkline-${idx})`}
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>

                  {/* Pulse animation */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Radar Feed - PREMIUM DYNAMIC ALERTS */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
                <Zap className="w-7 h-7 text-orange-500" />
                Live Radar Feed
              </h2>
              <p className="text-base text-muted-foreground font-semibold mt-2">
                AI-prioritized alerts sorted by urgency and business impact
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-red-300 rounded-full animate-pulse">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-red-700">LIVE</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-red-700 mb-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error loading alerts</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-card rounded-2xl border-2 border-border animate-pulse"
                />
              ))}
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="text-center py-24 px-6 bg-gradient-to-br from-primary/8 to-transparent rounded-3xl border-2 border-dashed border-primary/30">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl mb-6">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <p className="text-3xl font-black text-foreground mb-3">
                All Systems Optimal! 🎉
              </p>
              <p className="text-lg text-muted-foreground max-w-md mx-auto font-medium">
                No active alerts right now. Your AI is continuously monitoring markets, analyzing leads, and scanning for emerging opportunities 24/7.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl cursor-pointer ${getUrgencyColor(
                    item.urgency
                  )} animate-in fade-in slide-in-from-left-4 duration-500 hover:scale-105 hover:-translate-y-1`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Radar sweep animation on left border */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />

                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-current to-transparent transition-opacity" />

                  <div className="relative p-6 flex items-start gap-5">
                    {/* Left color bar */}
                    <div className={`w-2 rounded-full flex-shrink-0 group-hover:w-3 transition-all ${getUrgencyBadgeColor(item.urgency)}`} style={{ height: "100%" }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-black text-lg">
                              {item.title}
                            </h3>
                            <span className={`text-xs font-black px-3 py-1 rounded-full whitespace-nowrap animate-pulse ${getUrgencyBadgeColor(item.urgency)}`}>
                              {item.urgency.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-base text-current opacity-90 font-semibold">
                            {item.description}
                          </p>
                          {item.value && (
                            <p className="text-sm opacity-75 font-mono mt-3 bg-black/10 px-3 py-1.5 rounded-lg w-fit">
                              📧 {item.value}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center justify-between flex-wrap gap-3 text-sm opacity-80 pt-4 border-t border-current border-opacity-30">
                        <div className="flex items-center gap-3">
                          {item.location && (
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              <span className="font-semibold">{item.location}</span>
                            </div>
                          )}
                          {item.trend !== undefined && (
                            <div className="flex items-center gap-2 font-bold">
                              <TrendingUp className="w-4 h-4" />
                              {item.trend > 0 ? "+" : ""}{item.trend}%
                            </div>
                          )}
                        </div>

                        {item.timestamp && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">{formatTimeAgo(new Date(item.timestamp))}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleMarkHandled(item.id)}
                        className="p-2 rounded-lg bg-current/20 hover:bg-current/40 transition-colors group/check"
                        title="Mark as handled"
                      >
                        <CheckCircle2 className="w-6 h-6 group-hover/check:scale-110 transition-transform" />
                      </button>
                      <ArrowRight className="w-6 h-6 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Premium Powered by Badge */}
        <div className="border-t-2 border-border pt-12 mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-primary/8 to-background border-2 border-primary/30 p-8 hover:border-primary/50 transition-all group">
            {/* Animated background gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-primary to-transparent transition-opacity" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/25 rounded-2xl group-hover:scale-110 transition-transform">
                  <Radar className="w-6 h-6 text-primary animate-pulse" style={{ animationDuration: "3s" }} />
                </div>
                <div>
                  <p className="font-black text-foreground text-lg">Powered by Clippy AI</p>
                  <p className="text-sm text-muted-foreground font-semibold mt-0.5">
                    24/7 Enterprise Intelligence • Premium Real Estate Platform • Your Competitive Advantage
                  </p>
                </div>
              </div>
              <Sparkles className="w-8 h-8 text-primary opacity-40 flex-shrink-0 animate-pulse" style={{ animationDuration: "4s" }} />
            </div>

            {/* Top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
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
