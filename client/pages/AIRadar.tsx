import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radar,
  AlertCircle,
  Target,
  Activity,
  Sparkles,
  ArrowRight,
  CheckCircle2,
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
  description: string;
  accentColor: "green" | "red";
}

const PREMIUM_SAMPLE_ALERTS: RadarItem[] = [
  {
    id: "alert-1",
    type: "price_drop",
    title: "🔥 Price Drop Alert: Eastwood, NSW",
    description: "Property at 42 Park Ave reduced $75K",
    urgency: "high",
    location: "Eastwood, NSW 2122",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-2",
    type: "market_alert",
    title: "📈 Market Surge: Inner West",
    description: "3-bedroom homes up 4.2% week-on-week",
    urgency: "medium",
    location: "Inner West Sydney",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-3",
    type: "listing_opportunity",
    title: "⭐ High-Demand Suburb Alert",
    description: "Paddington: Only 3 active listings",
    urgency: "medium",
    location: "Paddington, NSW 2021",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

export default function AIRadar() {
  const [radarItems, setRadarItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [handledItems, setHandledItems] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      label: "Mining detected Tollell yags",
      value: 4940,
      description: "Active monitoring",
      accentColor: "green",
    },
    {
      label: "Mipning detected Pollell yags",
      value: 3900,
      description: "Issues detected",
      accentColor: "red",
    },
    {
      label: "Mipning detected Pollell yags",
      value: 2360,
      description: "Metrics tracked",
      accentColor: "green",
    },
    {
      label: "Mipning detected Tollell yags",
      value: 1540,
      description: "Opportunities",
      accentColor: "red",
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
        .select("id, full_name, source, created_at")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .eq("status", "new")
        .limit(3);

      const items: RadarItem[] = [];
      leads?.forEach((lead) => {
        items.push({
          id: `lead-${lead.id}`,
          type: "hot_lead",
          title: `🔥 ${lead.full_name || "New Lead"}`,
          description: `New ${lead.source} inquiry`,
          urgency: "high",
          timestamp: lead.created_at,
        });
      });

      setRadarItems(items.length === 0 ? PREMIUM_SAMPLE_ALERTS : items);
    } catch (err) {
      setRadarItems(PREMIUM_SAMPLE_ALERTS);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRadarItems();
  }, [userOrgId, navigate]);

  const handleMarkHandled = (itemId: string) => {
    const newHandled = new Set(handledItems);
    newHandled.has(itemId) ? newHandled.delete(itemId) : newHandled.add(itemId);
    setHandledItems(newHandled);
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
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
      {/* DARK NAVY BACKGROUND - Very dark */}
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-[#0f1419] via-[#1a2942] to-[#0f1419]" />

      {/* Subtle glow orbs */}
      <div className="fixed inset-0 -z-40 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* HEADER - Premium dark with teal accents */}
        <div className="bg-[#1a2435]/80 backdrop-blur-xl border-b border-cyan-500/30 px-8 py-5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Radar className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-xl font-black text-white">Clippy</h1>
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors">
              <Volume2 className="w-5 h-5 text-cyan-400" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-cyan-500/30">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="text-sm font-black text-cyan-400">$300/month</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="px-8 py-12 space-y-14">
          {/* HERO SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-3 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg mb-8">
                <span className="text-sm font-bold text-cyan-300">AI Radar</span>
              </div>

              <h2 className="text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
                {activeAlerts.length > 0
                  ? `${activeAlerts.length} Urgent Opportunities`
                  : "Market Intelligence"}
              </h2>

              <p className="text-lg text-slate-300 mb-10 leading-relaxed max-w-lg font-medium">
                Premium premiumities cremincs sof herfer atewid liot al hot Page.
              </p>

              <button className="flex items-center gap-2 px-7 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black rounded-lg transition-all hover:shadow-2xl hover:shadow-cyan-500/50">
                <Target className="w-5 h-5" />
                Take Action
              </button>
            </div>

            {/* 3D GEOMETRIC SHAPE - Vibrant cyan with glow */}
            <div className="hidden lg:flex items-center justify-center relative">
              {/* Glow background - strong */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 to-blue-600/20 rounded-full blur-3xl" />

              <svg
                viewBox="0 0 300 300"
                className="w-80 h-80 relative z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="hexGlow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Main hexagon - VIBRANT */}
                <polygon
                  points="150,40 230,90 260,190 200,260 100,260 40,190 70,90"
                  fill="url(#hexGradient)"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  filter="url(#hexGlow)"
                />

                {/* Inner layer 1 */}
                <polygon
                  points="150,80 215,115 240,190 190,245 110,245 65,190 90,115"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  opacity="0.6"
                />

                {/* Inner layer 2 */}
                <polygon
                  points="150,120 200,145 220,190 175,225 125,225 80,190 100,145"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="1.5"
                  opacity="0.4"
                />

                {/* Center dot */}
                <circle cx="150" cy="150" r="10" fill="#06b6d4" />
                <circle cx="150" cy="150" r="20" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.3" />
              </svg>
            </div>
          </div>

          {/* METRICS GRID - 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                className={`relative p-8 rounded-2xl border-2 transition-all group ${
                  metric.accentColor === "green"
                    ? "border-cyan-500/60 bg-gradient-to-br from-[#1a3a4a]/80 to-[#0f2535]/60 hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/30"
                    : "border-slate-700/40 bg-gradient-to-br from-[#1a2942]/60 to-[#0f1419]/40 hover:border-slate-600"
                }`}
              >
                <div className="relative z-10">
                  <p className="text-7xl font-black text-white mb-4">{metric.value}</p>
                  <p className="text-slate-300 text-sm font-semibold leading-relaxed mb-6">
                    {metric.label}
                  </p>

                  <button
                    className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                      metric.accentColor === "green"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/40"
                        : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40"
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
            <h3 className="text-4xl font-black text-white">Live Radar Feed</h3>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-slate-800/30 rounded-xl border border-slate-700/40 animate-pulse"
                  />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-16 px-8 bg-slate-800/20 rounded-2xl border border-slate-700/40">
                <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <p className="text-xl text-slate-300 font-semibold">All Systems Optimal! 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAlerts.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-6 bg-[#1a2942]/60 border border-slate-700/40 rounded-xl hover:bg-[#1a2942]/80 hover:border-cyan-500/40 transition-all group"
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

                      <span className="px-3 py-1 bg-red-600/60 text-red-200 rounded text-xs font-bold whitespace-nowrap">
                        LIVE
                      </span>
                    </div>

                    <button
                      onClick={() => handleMarkHandled(item.id)}
                      className="ml-4 px-5 py-2 bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      {handledItems.has(item.id) ? "✓ Handled" : "Mark as Handled"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FLOATING AI SUGGESTS BAR */}
          {hotLeadsCount > 0 && (
            <div className="flex justify-center py-12">
              <div className="w-full max-w-2xl px-6 py-5 bg-gradient-to-r from-[#1a3a4a]/80 to-[#0f2535]/60 border border-cyan-500/40 rounded-2xl backdrop-blur-xl">
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
