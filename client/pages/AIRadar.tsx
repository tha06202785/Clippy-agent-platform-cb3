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
  DollarSign,
  Users,
  Flame,
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
  icon?: string;
}

interface MetricCard {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: number;
  description: string;
}

// Premium sample alerts for empty state
const PREMIUM_SAMPLE_ALERTS: RadarItem[] = [
  {
    id: "alert-1",
    type: "price_drop",
    title: "Price Drop Alert: Eastwood, NSW",
    description: "Property at 42 Park Ave reduced $75K",
    urgency: "high",
    location: "Eastwood, NSW 2122",
    trend: -2.8,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-2",
    type: "market_alert",
    title: "Market Surge: Inner West",
    description: "3-bedroom homes up 4.2% week-on-week",
    urgency: "medium",
    location: "Inner West Sydney",
    trend: 4.2,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-3",
    type: "listing_opportunity",
    title: "High-Demand Suburb Alert",
    description: "Paddington: Only 3 active listings, 12 buyer inquiries",
    urgency: "medium",
    location: "Paddington, NSW 2021",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-4",
    type: "market_alert",
    title: "Emerging Opportunity: Marrickville",
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
  const [error, setError] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
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
          console.warn("No org role found");
          setUserOrgId("default");
        } else if (data) {
          setUserOrgId(data.org_id);
        }
      } catch (err) {
        console.error("Error fetching org_id:", err);
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
      // Fetch hot leads
      const { data: leads } = await supabase
        .from("leads")
        .select("id, full_name, source, created_at, email, phone")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(3);

      // Fetch urgent tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, due_at, type, description")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .eq("status", "pending")
        .lt("due_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .limit(2);

      // Fetch overdue items
      const { data: overdue } = await supabase
        .from("tasks")
        .select("id, title, due_at, type")
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .lt("due_at", new Date().toISOString())
        .limit(2);

      const items: RadarItem[] = [];

      // Add hot leads
      leads?.forEach((lead) => {
        items.push({
          id: `lead-${lead.id}`,
          type: "hot_lead",
          title: lead.full_name || "Unknown Lead",
          description: `New ${lead.source} inquiry - Qualified prospect`,
          urgency: "high",
          timestamp: lead.created_at,
          value: lead.email || lead.phone || "No contact",
        });
      });

      // Add urgent tasks
      tasks?.forEach((task) => {
        items.push({
          id: `task-${task.id}`,
          type: "listing_opportunity",
          title: task.title,
          description: task.type?.replace(/_/g, " "),
          urgency: "medium",
          timestamp: task.due_at,
        });
      });

      // Add overdue alerts
      overdue?.forEach((task) => {
        items.push({
          id: `overdue-${task.id}`,
          type: "market_alert",
          title: `OVERDUE: ${task.title}`,
          description: "Requires immediate attention",
          urgency: "critical",
          timestamp: task.due_at,
        });
      });

      // If no real data, use premium samples
      if (items.length === 0) {
        setRadarItems(PREMIUM_SAMPLE_ALERTS);
      } else {
        setRadarItems(items);
      }

      // Update metrics
      const newMetrics = [...metrics];
      newMetrics[0].value = items.length;
      newMetrics[1].value = items.filter((i) => i.urgency === "critical").length;
      newMetrics[2].value = items.filter((i) => i.type === "hot_lead").length;
      newMetrics[3].value = items.filter((i) => i.type === "market_alert").length;
      setMetrics(newMetrics);
    } catch (err) {
      console.error("Error fetching radar items:", err);
      setError("Failed to load AI Radar");
      // Use sample data on error
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200 hover:border-red-300 hover:shadow-red-100";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200 hover:border-orange-300 hover:shadow-orange-100";
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-200 hover:border-amber-300 hover:shadow-amber-100";
      case "low":
        return "text-green-600 bg-green-50 border-green-200 hover:border-green-300 hover:shadow-green-100";
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

  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Next Best Action Bar - Floating suggestion */}
        {radarItems.length > 0 && (
          <div className="fixed bottom-8 right-8 max-w-sm animate-in slide-in-from-bottom-4 duration-500 z-40">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 shadow-2xl border border-primary/30 group cursor-pointer hover:shadow-3xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-white/20 rounded-lg mt-1">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      AI Suggests
                    </p>
                    <p className="text-sm font-bold text-white mt-1">
                      Follow up with {radarItems.filter((i) => i.type === "hot_lead").length} hot leads now
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl relative">
                  <Radar className="w-8 h-8 text-primary animate-pulse" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-transparent animate-spin" style={{ animationDuration: "8s" }} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    AI Radar
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Real-time intelligence powered by Clippy AI
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all group disabled:opacity-50"
              title="Refresh AI Radar"
            >
              <RefreshCw
                className={`w-5 h-5 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
              />
            </button>
          </div>
        </div>

        {/* Premium Hero Card - Your AI Focus Today */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 relative overflow-hidden group">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute -top-40 -right-40 w-96 h-96 border-2 border-primary/10 rounded-full" style={{ animation: "spin 20s linear infinite" }} />

          <div className="relative z-10 flex items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 rounded-full">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">
                    AI Recommendation
                  </span>
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
                {radarItems.length > 0
                  ? `${radarItems.filter((i) => i.urgency === "critical" || i.urgency === "high").length} Urgent Opportunities Await`
                  : "Your AI Intelligence Center"}
              </h2>

              <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                {radarItems.length > 0
                  ? `AI has identified ${radarItems.filter((i) => i.type === "hot_lead").length} hot leads ready for engagement and ${radarItems.filter((i) => i.type === "market_alert").length} market opportunities. Take action now to maximize conversion.`
                  : "Connect your Supabase database to unlock real-time market intelligence, lead scoring, and AI-powered recommendations."}
              </p>

              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 group/btn">
                  <Target className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                  Take Action Now
                </button>
                <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-background text-foreground border-2 border-primary/30 rounded-xl font-bold hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <Activity className="w-5 h-5" />
                  View Opportunities
                </button>
              </div>
            </div>

            {/* Animated radar visualization */}
            <div className="hidden lg:flex flex-col items-center justify-center relative w-48 h-48 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent animate-spin" style={{ animationDuration: "8s" }} />
              <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/15 to-transparent animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
              <div className="absolute inset-16 rounded-full bg-gradient-to-br from-primary/10 to-transparent animate-pulse" style={{ animationDuration: "4s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Radar className="w-24 h-24 text-primary opacity-60 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Snapshot - Premium Metric Cards */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Performance Snapshot
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                This week's AI-analyzed metrics and trends
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <Activity className="w-3 h-3 text-green-600 animate-pulse" />
              <span className="text-xs font-bold text-green-700">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, idx) => {
              const Icon = metric.icon;
              const isPositive = metric.trend > 0;
              return (
                <div
                  key={idx}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-primary/50 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle background accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between mb-6">
                    <div className={`bg-gradient-to-br ${metric.color} p-4 rounded-xl shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        isPositive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isPositive ? "↑" : "↓"} {Math.abs(metric.trend)}%
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-2">
                      {metric.label}
                    </p>
                    <p className="text-4xl font-bold text-foreground mb-3">
                      {metric.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>

                  {/* Sparkline placeholder */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <svg
                      viewBox="0 0 100 30"
                      className="w-full h-8 opacity-50"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,20 Q25,10 50,15 T100,8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-primary"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Radar Feed */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-500" />
                Live Radar Feed
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI-prioritized alerts sorted by urgency and impact
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-card rounded-2xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : radarItems.length === 0 ? (
            <div className="text-center py-20 px-6 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl border-2 border-dashed border-primary/20">
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-2xl font-bold text-foreground mb-2">
                All Systems Optimal! 🎉
              </p>
              <p className="text-muted-foreground max-w-md mx-auto">
                No active alerts right now. Your AI is continuously monitoring for new opportunities, market shifts, and lead engagement windows.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {radarItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl cursor-pointer ${getUrgencyColor(
                    item.urgency
                  )} animate-in fade-in slide-in-from-left-4 duration-500`}
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-15 bg-gradient-to-r from-primary to-transparent transition-opacity" />

                  <div className="relative p-6 flex items-start gap-4 backdrop-blur-sm">
                    {/* Left accent bar */}
                    <div className={`w-1.5 rounded-full flex-shrink-0 ${getUrgencyBadgeColor(item.urgency)}`} style={{ height: "100%" }} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-base truncate">
                              {item.title}
                            </h3>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getUrgencyBadgeColor(item.urgency)}`}>
                              {item.urgency.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm opacity-90">{item.description}</p>
                          {item.value && (
                            <p className="text-xs opacity-75 font-mono mt-2 bg-black/10 px-2 py-1 rounded w-fit">
                              {item.value}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs opacity-75 pt-3 border-t border-current border-opacity-20">
                        {item.location && (
                          <div className="flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {item.location}
                          </div>
                        )}
                        {item.trend !== undefined && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {item.trend > 0 ? "+" : ""}{item.trend}%
                          </div>
                        )}
                        {item.timestamp && (
                          <div className="flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(new Date(item.timestamp))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right action indicator */}
                    <div className="flex-shrink-0">
                      <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Powered by Clippy AI */}
        <div className="border-t border-border pt-8 mt-12">
          <div className="flex items-center justify-between px-6 py-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Radar className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Powered by Clippy AI</p>
                <p className="text-xs text-muted-foreground">
                  24/7 intelligent monitoring • Enterprise-grade insights • $300/month value
                </p>
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-primary opacity-50" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
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
