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
  Volume2,
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
  description: string;
  trend?: number;
  accentColor?: "green" | "red";
}

// Premium sample alerts
const PREMIUM_SAMPLE_ALERTS: RadarItem[] = [
  {
    id: "alert-1",
    type: "price_drop",
    title: "🔥 Price Drop Alert: Eastwood, NSW",
    description: "Property at 42 Park Ave reduced $75K",
    urgency: "high",
    location: "Eastwood, NSW 2122",
    trend: -2.8,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-2",
    type: "market_alert",
    title: "📈 Market Surge: Inner West",
    description: "3-bedroom homes up 4.2% week-on-week",
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
    description: "Average days on market down to 18 (from 25)",
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
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      label: "Mining detected Tollell yags",
      value: 4940,
      icon: Activity,
      description: "Active monitoring",
      accentColor: "green",
    },
    {
      label: "Mipning detected Pollell yags",
      value: 3900,
      icon: AlertCircle,
      description: "Issues detected",
      accentColor: "red",
    },
    {
      label: "Mipning detected Pollell yags",
      value: 2360,
      icon: TrendingUp,
      description: "Metrics tracked",
      accentColor: "green",
    },
    {
      label: "Mipning detected Tollell yags",
      value: 1540,
      icon: Flame,
      description: "Opportunities",
      accentColor: "red",
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
    } catch (err) {
      setRadarItems(PREMIUM_SAMPLE_ALERTS);
    }

    setLoading(false);
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

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-red-600 text-white";
      case "medium":
        return "bg-amber-600 text-white";
      case "low":
        return "bg-emerald-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const activeAlerts = radarItems.filter((item) => !handledItems.has(item.id));
  const hotLeadsCount = activeAlerts.filter((i) => i.type === "hot_lead").length;

  return (
    <Layout showNav={true}>
      {/* Deep Navy Background */}
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />

      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 -z-40 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gradient-to-tr from-blue-500/10 to-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* PREMIUM HEADER with pricing */}
        <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/20 backdrop-blur-xl border-b border-cyan-400/20 px-8 py-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Radar className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black text-white">Clippy</h1>
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
              <Volume2 className="w-5 h-5 text-cyan-300" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-700/50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="text-sm font-bold text-cyan-300">$300/month</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 py-10 space-y-12">
          {/* HERO SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg mb-8">
                <span className="text-sm font-bold text-cyan-300">AI Radar</span>
              </div>

              <h2 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
                {activeAlerts.length > 0
                  ? `${activeAlerts.filter((i) => i.urgency === "critical" || i.urgency === "high").length} Urgent Opportunities Await`
                  : "24/7 Market Intelligence"}
              </h2>

              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-lg">
                Premium premiumities cremincs sof herfer atewid liot al hot Page.
              </p>

              <button className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg transition-colors">
                <Target className="w-5 h-5" />
                Take Action
              </button>
            </div>

            {/* 3D Geometric Shape - Premium SVG */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-80 h-80">
                <svg
                  viewBox="0 0 300 300"
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Outer geometric shape */}
                  <polygon
                    points="150,50 230,100 250,180 200,250 100,250 50,180 70,100"
                    fill="url(#hexGradient)"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    opacity="0.7"
                    filter="url(#glow)"
                  />

                  {/* Inner layers for depth */}
                  <polygon
                    points="150,90 210,120 220,180 170,220 130,220 80,180 90,120"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    opacity="0.5"
                  />

                  <polygon
                    points="150,130 190,145 195,185 155,210 105,210 60,185 65,145"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="1"
                    opacity="0.3"
                  />

                  {/* Center point */}
                  <circle cx="150" cy="150" r="8" fill="#06b6d4" opacity="0.9" />
                  <circle cx="150" cy="150" r="15" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.2" />
                </svg>

                {/* Glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl -z-10" />
              </div>
            </div>
          </div>

          {/* METRICS GRID - 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                className={`relative p-8 rounded-2xl border-2 transition-all group backdrop-blur-sm ${
                  metric.accentColor === "green"
                    ? "border-cyan-500/40 bg-gradient-to-br from-slate-800/40 to-slate-900/30 hover:border-cyan-500/70"
                    : "border-slate-700/40 bg-gradient-to-br from-slate-800/30 to-slate-900/20 hover:border-slate-600/70"
                }`}
              >
                {/* Glow on hover for green cards */}
                {metric.accentColor === "green" && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                )}

                <div className="relative z-10">
                  <p className="text-7xl font-black text-white mb-4">{metric.value}</p>
                  <p className="text-slate-300 text-sm font-semibold mb-6">{metric.label}</p>

                  <button
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                      metric.accentColor === "green"
                        ? "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                        : "bg-red-600/80 hover:bg-red-600 text-white"
                    }`}
                  >
                    Change
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* LIVE RADAR FEED */}
          <div className="space-y-6">
            <h3 className="text-3xl font-black text-white">Live Radar Feed</h3>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-slate-800/40 rounded-xl border border-slate-700/40 animate-pulse"
                  />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-16 px-8 bg-slate-800/30 rounded-2xl border border-slate-700/40">
                <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-4 opacity-60" />
                <p className="text-xl text-slate-300 font-semibold">All Systems Optimal! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-6 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:bg-slate-800/60 hover:border-slate-600/60 transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span
                        className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap ${getUrgencyBadgeColor(
                          item.urgency
                        )}`}
                      >
                        {item.urgency.toUpperCase()}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{item.title}</p>
                        <p className="text-slate-400 text-sm truncate">{item.description}</p>
                      </div>

                      <span className="px-3 py-1 bg-red-600/30 text-red-300 rounded text-xs font-bold whitespace-nowrap">
                        LIVE
                      </span>
                    </div>

                    <button
                      onClick={() => handleMarkHandled(item.id)}
                      className="ml-4 px-5 py-2 bg-slate-700/60 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      {handledItems.has(item.id) ? "Handled ✓" : "Mark as Handled"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FLOATING AI SUGGESTS BAR - Bottom Center */}
          {hotLeadsCount > 0 && (
            <div className="flex justify-center py-8">
              <div className="w-full max-w-2xl px-6 py-5 bg-gradient-to-r from-slate-800/80 to-slate-900/60 border border-slate-700/60 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <span className="text-center text-white font-semibold">
                    <span className="text-cyan-300">AI Suggests:</span> Follow up with {hotLeadsCount} hot{" "}
                    {hotLeadsCount === 1 ? "lead" : "leads"} now
                  </span>
                  <ArrowRight className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
