import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Users,
  Share2,
  ArrowRight,
  TrendingUp,
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what you need to focus on today
          </p>

          {/* User Info Box */}
          <div className="mt-6 p-4 bg-clippy-50 border border-primary/20 rounded-lg text-sm">
            <p className="text-foreground font-semibold mb-2">Your Account</p>
            <div className="space-y-1 text-muted-foreground font-mono text-xs">
              <p>
                <span className="font-semibold">Email:</span> {userEmail || "Loading..."}
              </p>
              <p>
                <span className="font-semibold">User ID:</span> {userId?.substring(0, 8) || "Loading..."}
              </p>
              <p>
                <span className="font-semibold">Status:</span> ✅ Logged In
              </p>
            </div>
            {usingSampleData && (
              <p className="text-xs text-primary mt-3 font-semibold">
                💡 Showing sample data. Add tasks/leads to your Supabase database to see real data.
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Tasks Today"
            value={tasksToday.length}
            icon={CheckCircle2}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            title="New Leads"
            value={newLeads.length}
            icon={Users}
            color="from-green-500 to-green-600"
          />
          <StatCard
            title="Scheduled Posts"
            value={scheduledPosts.length}
            icon={Share2}
            color="from-purple-500 to-purple-600"
          />
          <StatCard
            title="Conversion Rate"
            value="12.5%"
            icon={TrendingUp}
            color="from-orange-500 to-orange-600"
          />
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
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`bg-gradient-to-br ${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
