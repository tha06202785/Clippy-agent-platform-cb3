import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Users,
  Share2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Target,
  Zap,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

interface Task {
  id: string;
  title: string;
  type: string;
  description?: string;
  due_at: string;
  lead_id?: string;
  listing_id?: string;
}

interface Lead {
  id: string;
  full_name: string;
  source: string;
  created_at: string;
}

interface Post {
  id: string;
  type: string;
  due_at: string;
  listings?: { address: string };
}

// Sample data for demonstration
const SAMPLE_TASKS: Task[] = [
  {
    id: "1",
    title: "Follow up with John Doe",
    type: "follow_up_24h",
    description: "Check on property interest",
    due_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Post to Facebook for 123 Main St",
    type: "post_facebook",
    description: "Schedule listing post",
    due_at: new Date().toISOString(),
  },
];

const SAMPLE_LEADS: Lead[] = [
  {
    id: "1",
    full_name: "Jane Smith",
    source: "web",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    full_name: "Mike Wilson",
    source: "phone",
    created_at: new Date().toISOString(),
  },
];

const typeConfig: { [key: string]: { bg: string; text: string; label: string } } = {
  follow_up_24h: { bg: "bg-blue-50", text: "text-blue-700", label: "Follow-up" },
  inspection_book: { bg: "bg-purple-50", text: "text-purple-700", label: "Inspection" },
  send_contract: { bg: "bg-orange-50", text: "text-orange-700", label: "Contract" },
  post_facebook: { bg: "bg-green-50", text: "text-green-700", label: "Post FB" },
  post_instagram: { bg: "bg-pink-50", text: "text-pink-700", label: "Post IG" },
  call: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Call" },
};

const sourceConfig: { [key: string]: string } = {
  web: "Web Form",
  phone: "Phone",
  email: "Email",
  manual: "Manual Entry",
  facebook: "Facebook",
  instagram: "Instagram",
};

const platformConfig: { [key: string]: string } = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter",
};

export default function Dashboard() {
  const [tasksToday, setTasksToday] = useState<Task[]>([]);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          console.log("No user session, redirecting to login");
          navigate("/login");
          return;
        }

        const currentUserId = session.user.id;
        const currentUserEmail = session.user.email;

        setUserId(currentUserId);
        setUserEmail(currentUserEmail || null);

        console.log("Logged in as:", currentUserEmail);

        // Try to fetch real data from Supabase
        try {
          // Fetch today's tasks
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .eq("assigned_to_user_id", currentUserId)
            .gte("due_at", today.toISOString())
            .lt("due_at", tomorrow.toISOString())
            .order("due_at", { ascending: true });

          if (tasksError) {
            console.warn("Tasks fetch warning:", tasksError.message);
          } else if (tasks && tasks.length > 0) {
            setTasksToday(tasks);
          }

          // Fetch new leads
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);

          const { data: leads, error: leadsError } = await supabase
            .from("leads")
            .select("*")
            .eq("assigned_to_user_id", currentUserId)
            .gte("created_at", oneDayAgo.toISOString())
            .order("created_at", { ascending: false });

          if (leadsError) {
            console.warn("Leads fetch warning:", leadsError.message);
          } else if (leads && leads.length > 0) {
            setNewLeads(leads);
          }

          // Fetch scheduled posts
          const { data: posts, error: postsError } = await supabase
            .from("tasks")
            .select("*, listings(address)")
            .eq("assigned_to_user_id", currentUserId)
            .in("type", ["post_facebook", "post_instagram"])
            .gte("due_at", new Date().toISOString())
            .order("due_at", { ascending: true });

          if (postsError) {
            console.warn("Posts fetch warning:", postsError.message);
          } else if (posts && posts.length > 0) {
            setScheduledPosts(posts);
          }

          // If no real data, use sample data for demo
          if ((!tasks || tasks.length === 0) && (!leads || leads.length === 0) && (!posts || posts.length === 0)) {
            console.log("No data found in database, using sample data for demo");
            setUsingSampleData(true);
            setTasksToday(SAMPLE_TASKS);
            setNewLeads(SAMPLE_LEADS);
          }
        } catch (err: any) {
          console.error("Error fetching data:", err);
          setUsingSampleData(true);
          setTasksToday(SAMPLE_TASKS);
          setNewLeads(SAMPLE_LEADS);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError("Failed to load dashboard");
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground mb-6">
            Here's your AI-powered business dashboard
          </p>

          {/* Premium Hero Card - AI Focus Today */}
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-8 mb-8 hover:shadow-lg hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />

            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                    AI Co-Pilot
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Your AI Focus Today
                </h2>
                <p className="text-muted-foreground mb-6 max-w-lg">
                  {newLeads.length > 0
                    ? `You have ${newLeads.length} new ${newLeads.length === 1 ? "lead" : "leads"} waiting. Prioritize your follow-ups and convert them into wins.`
                    : tasksToday.length > 0
                    ? `Focus on your ${tasksToday.length} tasks for today to stay on track.`
                    : "No urgent items right now. Great job! Review upcoming tasks for tomorrow."}
                </p>
                <div className="flex gap-3">
                  {newLeads.length > 0 && (
                    <Link
                      to="/inbox"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
                    >
                      <Target className="w-5 h-5" />
                      Action This Lead
                    </Link>
                  )}
                  <Link
                    to="/ai-radar"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
                  >
                    <Zap className="w-5 h-5" />
                    View AI Radar
                  </Link>
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-center justify-center">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent animate-spin" style={{ animationDuration: "8s" }} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-transparent animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-primary opacity-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Info Box */}
          {usingSampleData && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-semibold">Demo Mode</p>
                  <p className="text-blue-700 text-xs mt-1">
                    You're viewing sample data. Connect your Supabase database to see real leads, tasks, and insights.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Snapshot - Stats Row */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance Snapshot
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Tasks Today"
              value={tasksToday.length}
              icon={CheckCircle2}
              color="from-blue-500 to-blue-600"
              change={tasksToday.length > 0 ? 5 : -2}
            />
            <StatCard
              title="New Leads"
              value={newLeads.length}
              icon={Users}
              color="from-green-500 to-green-600"
              change={newLeads.length > 0 ? 12 : 0}
            />
            <StatCard
              title="Scheduled Posts"
              value={scheduledPosts.length}
              icon={Share2}
              color="from-purple-500 to-purple-600"
              change={scheduledPosts.length > 2 ? 8 : 0}
            />
            <StatCard
              title="Conversion Rate"
              value="12.5%"
              icon={TrendingUp}
              color="from-orange-500 to-orange-600"
              change={2.3}
            />
          </div>
        </div>

        {/* Market Pulse - Alerts Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Market Pulse
            </h2>
            <div className="space-y-3">
              <div className="bg-card rounded-xl border border-border p-4 hover:border-orange-500/50 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Suburb Prices Up 2.3% WoW
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sydney's eastern suburbs showing strong momentum
                    </p>
                  </div>
                  <span className="text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded">
                    +2.3%
                  </span>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4 hover:border-blue-500/50 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Upcoming Open House Guide
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best practices for weekend showings
                    </p>
                  </div>
                  <span className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded">
                    Guide
                  </span>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4 hover:border-purple-500/50 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Demand Surge: 3BR Homes
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Market inquiry up 15% for family properties
                    </p>
                  </div>
                  <span className="text-xs text-purple-600 font-semibold px-2 py-1 bg-purple-50 rounded">
                    Hot
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-foreground mb-6">Your Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Lead Response</span>
                    <span className="text-sm font-bold text-foreground">87%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Task Completion</span>
                    <span className="text-sm font-bold text-foreground">72%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "72%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="text-sm font-bold text-foreground">12.5%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "12.5%" }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-primary/20">
              <p className="text-xs text-muted-foreground mb-3">Powered by AI</p>
              <Link
                to="/ai-radar"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                See AI Insights
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Tasks Widget */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Today's Tasks
              </h2>
              <Link
                to="/planner"
                className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {tasksToday.length > 0 ? (
                tasksToday.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                  >
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        typeConfig[task.type]?.bg || "bg-gray-50"
                      } ${typeConfig[task.type]?.text || "text-gray-700"}`}
                    >
                      {typeConfig[task.type]?.label || task.type.replace(/_/g, " ")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {task.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {task.description || "No description"}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      {new Date(task.due_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No tasks due today! Great job! 🎉
                </p>
              )}
            </div>

            <Link
              to="/planner"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-border text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              View All Tasks
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* New Leads Widget */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                New Leads (Last 24h)
              </h2>
              <Link
                to="/inbox"
                className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {newLeads.length > 0 ? (
                newLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {lead.full_name?.charAt(0).toUpperCase() || "L"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {lead.full_name || "Unknown Lead"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sourceConfig[lead.source] || lead.source} •{" "}
                        {new Date(lead.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No new leads in the last 24h
                </p>
              )}
            </div>

            <Link
              to="/inbox"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-border text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              View All Leads
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Scheduled Posts Widget */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" />
                Scheduled Posts
              </h2>
              <Link
                to="/planner"
                className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledPosts.length > 0 ? (
                scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {post.listings?.address || "Unknown Listing"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {platformConfig[post.type.replace("post_", "")] ||
                            post.type.replace("post_", "")}
                        </p>
                      </div>
                      <div className="inline-flex px-2.5 py-1 bg-primary/10 rounded-full">
                        <span className="text-xs font-semibold text-primary">
                          {platformConfig[post.type.replace("post_", "")] ||
                            post.type.replace("post_", "")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.due_at).toLocaleDateString()} •{" "}
                      {new Date(post.due_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8 md:col-span-2">
                  No scheduled posts yet
                </p>
              )}
            </div>

            <Link
              to="/planner"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-border text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              View All Posts
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: number;
}

function StatCard({ title, value, icon: Icon, color, change }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <div
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  isPositive
                    ? "bg-green-100 text-green-700"
                    : isNegative
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {isPositive ? "↑" : isNegative ? "↓" : "→"} {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
        <div className={`bg-gradient-to-br ${color} p-3 rounded-lg shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
