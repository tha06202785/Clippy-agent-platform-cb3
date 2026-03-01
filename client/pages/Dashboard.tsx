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
  follow_up_24h: { bg: "bg-blue-600/30", text: "text-blue-300", label: "Follow-up" },
  inspection_book: { bg: "bg-purple-600/30", text: "text-purple-300", label: "Inspection" },
  send_contract: { bg: "bg-orange-600/30", text: "text-orange-300", label: "Contract" },
  post_facebook: { bg: "bg-green-600/30", text: "text-green-300", label: "Post FB" },
  post_instagram: { bg: "bg-pink-600/30", text: "text-pink-300", label: "Post IG" },
  call: { bg: "bg-yellow-600/30", text: "text-yellow-300", label: "Call" },
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
          <div className="bg-gradient-to-br from-cyan-500/15 to-blue-600/10 border border-cyan-400/40 rounded-2xl p-8 mb-8 hover:shadow-2xl hover:shadow-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 relative overflow-hidden backdrop-blur-sm">
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -z-10" />

            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
                  <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                    🚀 AI Co-Pilot
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2">
                  Your AI Focus Today
                </h2>
                <p className="text-cyan-200/70 mb-6 max-w-lg font-semibold">
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 rounded-lg font-semibold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <Target className="w-5 h-5" />
                      Action This Lead
                    </Link>
                  )}
                  <Link
                    to="/ai-radar"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/60 text-cyan-300 border-2 border-cyan-400/60 rounded-lg font-semibold hover:bg-slate-800 hover:border-cyan-400 transition-all duration-300"
                  >
                    <Zap className="w-5 h-5" />
                    View AI Radar
                  </Link>
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-center justify-center">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-transparent animate-spin" style={{ animationDuration: "8s" }} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-cyan-300 opacity-70 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Info Box */}
          {usingSampleData && (
            <div className="p-4 bg-cyan-600/20 border border-cyan-500/40 rounded-lg text-sm mb-6 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-cyan-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-cyan-200 font-semibold">Demo Mode</p>
                  <p className="text-cyan-300/70 text-xs mt-1">
                    You're viewing sample data. Connect your Supabase database to see real leads, tasks, and insights.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Snapshot - Stats Row */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-3 drop-shadow-lg">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
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
            <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-3 drop-shadow-lg">
              <Zap className="w-6 h-6 text-orange-400 animate-pulse" style={{ animationDuration: "1s" }} />
              Market Pulse
            </h2>
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/10 rounded-xl border-2 border-orange-500/40 p-4 hover:border-orange-500/70 hover:shadow-2xl hover:shadow-orange-500/30 transition-all backdrop-blur-sm group">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-600/40 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-orange-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      Suburb Prices Up 2.3% WoW
                    </p>
                    <p className="text-xs text-orange-200/70 mt-1">
                      Sydney's eastern suburbs showing strong momentum
                    </p>
                  </div>
                  <span className="text-xs text-emerald-200 font-semibold px-3 py-1 bg-emerald-600/60 rounded-full whitespace-nowrap">
                    +2.3%
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 rounded-xl border-2 border-blue-500/40 p-4 hover:border-blue-500/70 hover:shadow-2xl hover:shadow-blue-500/30 transition-all backdrop-blur-sm group">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600/40 rounded-lg group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-4 h-4 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      Upcoming Open House Guide
                    </p>
                    <p className="text-xs text-blue-200/70 mt-1">
                      Best practices for weekend showings
                    </p>
                  </div>
                  <span className="text-xs text-blue-200 font-semibold px-3 py-1 bg-blue-600/60 rounded-full whitespace-nowrap">
                    Guide
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/10 rounded-xl border-2 border-purple-500/40 p-4 hover:border-purple-500/70 hover:shadow-2xl hover:shadow-purple-500/30 transition-all backdrop-blur-sm group">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-600/40 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      Demand Surge: 3BR Homes
                    </p>
                    <p className="text-xs text-purple-200/70 mt-1">
                      Market inquiry up 15% for family properties
                    </p>
                  </div>
                  <span className="text-xs text-purple-200 font-semibold px-3 py-1 bg-purple-600/60 rounded-full whitespace-nowrap">
                    Hot
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-gradient-to-br from-cyan-500/15 to-blue-600/10 rounded-2xl border-2 border-cyan-400/40 p-6 flex flex-col justify-between backdrop-blur-sm hover:border-cyan-400/60 transition-all">
            <div>
              <h3 className="font-black text-white mb-6">Your Metrics</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-cyan-200/70 font-semibold">Lead Response</span>
                    <span className="text-sm font-black text-cyan-300">87%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-700/40 rounded-full overflow-hidden border border-cyan-400/20">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-cyan-200/70 font-semibold">Task Completion</span>
                    <span className="text-sm font-black text-cyan-300">72%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-700/40 rounded-full overflow-hidden border border-cyan-400/20">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: "72%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-cyan-200/70 font-semibold">Conversion Rate</span>
                    <span className="text-sm font-black text-cyan-300">12.5%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-700/40 rounded-full overflow-hidden border border-cyan-400/20">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: "12.5%" }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-cyan-400/20">
              <p className="text-xs text-cyan-200/60 mb-3 font-semibold">✨ Powered by AI</p>
              <Link
                to="/ai-radar"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 rounded-lg text-sm font-black hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
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
          <div className="bg-gradient-to-br from-slate-800/60 to-blue-900/40 rounded-2xl border-2 border-cyan-400/40 p-6 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/30 hover:border-cyan-400/70 transition-all backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-cyan-400" />
                Today's Tasks
              </h2>
              <Link
                to="/planner"
                className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {tasksToday.length > 0 ? (
                tasksToday.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 p-4 bg-slate-800/40 rounded-lg border border-cyan-400/20 hover:border-cyan-400/50 hover:bg-slate-800/60 transition-all group"
                  >
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        typeConfig[task.type]?.bg || "bg-gray-600/30"
                      } ${typeConfig[task.type]?.text || "text-gray-300"}`}
                    >
                      {typeConfig[task.type]?.label || task.type.replace(/_/g, " ")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {task.title}
                      </p>
                      <p className="text-sm text-cyan-200/60">
                        {task.description || "No description"}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-cyan-300/80 whitespace-nowrap">
                      {new Date(task.due_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-cyan-200/60 py-8 font-semibold">
                  No tasks due today! Great job! 🎉
                </p>
              )}
            </div>

            <Link
              to="/planner"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-cyan-400/60 text-cyan-300 hover:bg-cyan-400/20 hover:border-cyan-400 transition-all font-semibold"
            >
              View All Tasks
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* New Leads Widget */}
          <div className="bg-gradient-to-br from-slate-800/60 to-blue-900/40 rounded-2xl border-2 border-cyan-400/40 p-6 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/30 hover:border-cyan-400/70 transition-all backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-cyan-400" />
                New Leads (Last 24h)
              </h2>
              <Link
                to="/inbox"
                className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {newLeads.length > 0 ? (
                newLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-cyan-400/20 hover:border-cyan-400/50 hover:bg-slate-800/60 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-cyan-300">
                        {lead.full_name?.charAt(0).toUpperCase() || "L"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {lead.full_name || "Unknown Lead"}
                      </p>
                      <p className="text-xs text-cyan-200/60">
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
                <p className="text-center text-cyan-200/60 py-8 font-semibold">
                  No new leads in the last 24h
                </p>
              )}
            </div>

            <Link
              to="/inbox"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-cyan-400/60 text-cyan-300 hover:bg-cyan-400/20 hover:border-cyan-400 transition-all font-semibold"
            >
              View All Leads
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Scheduled Posts Widget */}
          <div className="bg-gradient-to-br from-slate-800/60 to-blue-900/40 rounded-2xl border-2 border-cyan-400/40 p-6 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/30 hover:border-cyan-400/70 transition-all backdrop-blur-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Share2 className="w-6 h-6 text-cyan-400" />
                Scheduled Posts
              </h2>
              <Link
                to="/planner"
                className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledPosts.length > 0 ? (
                scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-slate-800/40 rounded-lg border border-cyan-400/20 hover:border-cyan-400/50 hover:bg-slate-800/60 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          {post.listings?.address || "Unknown Listing"}
                        </p>
                        <p className="text-sm text-cyan-200/60">
                          {platformConfig[post.type.replace("post_", "")] ||
                            post.type.replace("post_", "")}
                        </p>
                      </div>
                      <div className="inline-flex px-3 py-1 bg-cyan-500/30 rounded-full border border-cyan-400/40">
                        <span className="text-xs font-semibold text-cyan-300">
                          {platformConfig[post.type.replace("post_", "")] ||
                            post.type.replace("post_", "")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-cyan-200/60 font-medium">
                      {new Date(post.due_at).toLocaleDateString()} •{" "}
                      {new Date(post.due_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-cyan-200/60 py-8 md:col-span-2 font-semibold">
                  No scheduled posts yet
                </p>
              )}
            </div>

            <Link
              to="/planner"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-cyan-400/60 text-cyan-300 hover:bg-cyan-400/20 hover:border-cyan-400 transition-all font-semibold"
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
    <div className="bg-gradient-to-br from-slate-800/60 to-blue-900/40 rounded-2xl border-2 border-cyan-400/40 p-6 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/40 hover:border-cyan-400/70 transition-all duration-300 backdrop-blur-sm group">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-cyan-200/70 mb-2 uppercase tracking-widest">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-cyan-300">{value}</p>
            {change !== undefined && (
              <div
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  isPositive
                    ? "bg-emerald-600/60 text-emerald-200"
                    : isNegative
                    ? "bg-red-600/60 text-red-200"
                    : "bg-slate-600/60 text-slate-200"
                }`}
              >
                {isPositive ? "↑" : isNegative ? "↓" : "→"} {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
        <div className={`bg-gradient-to-br ${color} p-4 rounded-lg shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
