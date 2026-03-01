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
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

interface RadarItem {
  id: string;
  type: "hot_lead" | "listing_opportunity" | "market_alert";
  title: string;
  description: string;
  urgency: "critical" | "high" | "medium" | "low";
  value?: string;
  trend?: number;
  location?: string;
  timestamp?: string;
}

export default function AIRadar() {
  const [radarItems, setRadarItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
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

  // Fetch radar items (combination of hot leads, opportunities, alerts)
  useEffect(() => {
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
        // Fetch hot leads (new leads that haven't been contacted)
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
            description: `New ${lead.source} inquiry`,
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

        setRadarItems(items);
      } catch (err) {
        console.error("Error fetching radar items:", err);
        setError("Failed to load AI Radar");
      }

      setLoading(false);
    };

    fetchRadarItems();
  }, [userOrgId, navigate]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "text-red-500 bg-red-50 border-red-200";
      case "high":
        return "text-orange-500 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-500 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-500 bg-green-50 border-green-200";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <AlertCircle className="w-5 h-5" />;
      case "high":
        return <Zap className="w-5 h-5" />;
      case "medium":
        return <Activity className="w-5 h-5" />;
      case "low":
        return <Target className="w-5 h-5" />;
      default:
        return <Radar className="w-5 h-5" />;
    }
  };

  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl">
              <Radar className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Radar
              </h1>
              <p className="text-muted-foreground">
                Real-time intelligence on your leads, listings, and market opportunities
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground">
                Total Insights
              </span>
              <Radar className="w-5 h-5 text-primary group-hover:animate-spin" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {radarItems.length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Active alerts</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-red-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground">
                Critical
              </span>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-500">
              {radarItems.filter((i) => i.urgency === "critical").length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Require immediate action
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-orange-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground">
                Hot Leads
              </span>
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-500">
              {radarItems.filter((i) => i.type === "hot_lead").length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              New qualified prospects
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-green-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-muted-foreground">
                Opportunities
              </span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-500">
              {radarItems.filter((i) => i.type === "listing_opportunity").length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Upcoming actions
            </p>
          </div>
        </div>

        {/* Radar Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Live Radar Feed</h2>
              <p className="text-sm text-muted-foreground">
                Sorted by urgency and impact
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/30">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">
                {loading ? "Scanning..." : "Live"}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-card rounded-lg border border-border animate-pulse"
                />
              ))}
            </div>
          ) : radarItems.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold text-foreground mb-2">
                Radar is clear! 🎉
              </p>
              <p className="text-muted-foreground">
                No active alerts or urgent items. Great job staying on top of your business!
              </p>
            </div>
          ) : (
            radarItems.map((item, index) => (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-lg cursor-pointer ${getUrgencyColor(
                  item.urgency
                )} animate-in fade-in slide-in-from-left duration-500`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Background glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-primary to-transparent transition-opacity" />

                <div className="relative p-5 flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    {getUrgencyIcon(item.urgency)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-sm md:text-base truncate">
                          {item.title}
                        </p>
                        <p className="text-xs md:text-sm opacity-75 mt-1">
                          {item.description}
                        </p>
                        {item.value && (
                          <p className="text-xs opacity-60 mt-1 font-mono">
                            {item.value}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {item.timestamp && (
                          <div className="flex items-center gap-1 text-xs opacity-75">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 px-2 py-1 bg-black/20 rounded text-xs font-semibold opacity-75">
                          {item.urgency.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="mt-12 p-6 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground mb-1">
                AI-Powered Intelligence
              </p>
              <p className="text-sm text-muted-foreground">
                Clippy's AI analyzes your leads, listings, and tasks in real-time to surface the
                most important actions. Focus on what matters, and let AI handle the rest.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
