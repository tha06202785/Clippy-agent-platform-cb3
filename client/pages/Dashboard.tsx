import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import {
  CheckCircle2,
  Clock,
  Users,
  Share2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Project URL and Anon Key (Already Replaced) ---
const SUPABASE_URL = "https://mqydieqeybgxtjqogrwh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fgi9j879wWGlzEQbt0i7Yw_D7rYZG3g";
// -----------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- REVISED INTERFACES TO MATCH SUPABASE SCHEMA ---
interface SupabaseTask {
  id: string;
  org_id: string;
  lead_id: string | null;
  listing_id: string | null;
  due_at: string; // ISO string
  status: string;
  type: string; // e.g., 'follow_up_24h', 'inspection_book', 'post_facebook'
  title: string;
  description: string | null;
  payload_json: any;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
  listings?: { address: string } | null; // For joined listing address
}

interface SupabaseLead {
  id: string;
  org_id: string;
  primary_channel: string | null;
  source: string;
  status: string;
  stage: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  buyer_type: string | null;
  notes: string | null;
  last_contact_at: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- CONFIGS (ADAPTED TO EXPECT SUPABASE TYPES) ---
const typeConfig: { [key: string]: { bg: string; text: string; label: string } } = {
  "follow_up_24h": { bg: "bg-blue-50", text: "text-blue-700", label: "Follow-up" },
  "inspection_book": { bg: "bg-purple-50", text: "text-purple-700", label: "Inspection" },
  "send_contract": { bg: "bg-orange-50", text: "text-orange-700", label: "Contract" },
  "post_facebook": { bg: "bg-green-50", text: "text-green-700", label: "Post FB" },
  "post_instagram": { bg: "bg-pink-50", text: "text-pink-700", label: "Post IG" },
  "call": { bg: "bg-yellow-50", text: "text-yellow-700", label: "Call" },
  "schedule_inspection": { bg: "bg-purple-50", text: "text-purple-700", label: "Inspection" },
  // Add more as needed based on your 'tasks.type' enum/values
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
  const [tasksToday, setTasksToday] = useState<SupabaseTask[]>([]);
  const [newLeadsData, setNewLeadsData] = useState<SupabaseLead[]>([]);
  const [scheduledPostsData, setScheduledPostsData] = useState<SupabaseTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // For redirection if no user session

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      const userSession = await supabase.auth.getSession();
      const userId = userSession.data.session?.user?.id;
      const userEmail = userSession.data.session?.user?.email; // Get email for logging

      console.log("Supabase User ID:", userId); // Debugging line
      console.log("Supabase User Email:", userEmail); // Debugging line

      if (!userId) {
        console.warn("No user session found. Redirecting to login.");
        navigate('/signup'); // Redirect to signup/login if no user session
        return;
      }

      // --- Fetch Today's Tasks ---
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: fetchedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        // .eq('org_id', 'YOUR_ORG_ID') // TODO: Implement org_id filtering based on logged-in user's org
        .eq('assigned_to_user_id', userId)
        .gte('due_at', today.toISOString())
        .lt('due_at', tomorrow.toISOString())
        .order('due_at', { ascending: true });

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        setError("Failed to load tasks.");
      } else {
        setTasksToday(fetchedTasks || []);
        console.log("Fetched Tasks:", fetchedTasks); // Debugging line
      }

      // --- Fetch New Leads (Last 24h) ---
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: fetchedNewLeads, error: newLeadsError } = await supabase
        .from('leads')
        .select('*')
        // .eq('org_id', 'YOUR_ORG_ID') // TODO: Implement org_id filtering
        .eq('assigned_to_user_id', userId)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false });

      if (newLeadsError) {
        console.error("Error fetching new leads:", newLeadsError);
        setError("Failed to load new leads.");
      } else {
        setNewLeadsData(fetchedNewLeads || []);
        console.log("Fetched New Leads:", fetchedNewLeads); // Debugging line
      }

      // --- Fetch Scheduled Posts ---
      const { data: fetchedScheduledPosts, error: postsError } = await supabase
        .from('tasks')
        .select('*, listings(address)')
        // .eq('org_id', 'YOUR_ORG_ID') // TODO: Implement org_id filtering
        .eq('assigned_to_user_id', userId)
        .in('type', ['post_facebook', 'post_instagram'])
        .gte('due_at', new Date().toISOString()) // Only future posts
        .order('due_at', { ascending: true });

      if (postsError) {
        console.error("Error fetching scheduled posts:", postsError);
        setError("Failed to load scheduled posts.");
      } else {
        setScheduledPostsData(fetchedScheduledPosts || []);
        console.log("Fetched Scheduled Posts:", fetchedScheduledPosts); // Debugging line
      }

      setLoading(false);
    };

    loadDashboardData();

    // Listen for auth state changes to reload data
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadDashboardData();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]); // Added navigate to dependency array

  if (loading) {
    return <Layout showNav={true}><div className="max-w-7xl mx-auto p-6 text-center text-muted-foreground">Loading dashboard...</div></Layout>;
  }

  if (error) {
    return <Layout showNav={true}><div className="max-w-7xl mx-auto p-6 text-center text-destructive">{error}</div></Layout>;
  }

  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        {/* Your Account Details - Keep this for debugging if needed, can be removed later */}
        <div className="mb-4 p-4 border rounded-lg bg-blue-50 text-blue-800 text-sm">
          <p className="font-semibold">Your Account Details:</p>
          <p>Email: {supabase.auth.getSession().then(s => s.data.session?.user?.email)}</p>
          <p>User ID: {supabase.auth.getSession().then(s => s.data.session?.user?.id)}</p>
          <p>Status: ✅ Logged In</p>
          <p className="mt-2">💡 Check your Supabase dashboard under Authentication → Users to see this account.</p>
        </div>


        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, Agent! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what you need to focus on today
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Tasks Today"
            value={tasksToday.length} // Dynamic value
            icon={CheckCircle2}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            title="New Leads"
            value={newLeadsData.length} // Dynamic value
            icon={Users}
            color="from-green-500 to-green-600"
          />
          <StatCard
            title="Scheduled Posts"
            value={scheduledPostsData.length} // Dynamic value
            icon={Share2}
            color="from-purple-500 to-purple-600"
          />
          <StatCard
            title="Conversion Rate"
            value="12.5%" // Placeholder for now, requires more logic
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
                <Clock className="w-6 h-6 text-primary" /> Today's Tasks
              </h2>
              <Link
                to="/planner"
                className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3" id="today-tasks-list">
              {tasksToday.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${typeConfig[task.type]?.bg || 'bg-gray-50'
                      } ${typeConfig[task.type]?.text || 'text-gray-700'}`}
                  >
                    {typeConfig[task.type]?.label || task.type.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.description || (task.lead_id ? `Lead: ${task.lead_id.substring(0, 8)}...` : '') || (task.listing_id ? `Listing: ${task.listing_id.substring(0, 8)}...` : '')}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {tasksToday.length === 0 && <p className="text-center text-muted-foreground py-4">No tasks due today!</p>}
            </div>
            <Link
              to="/planner"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-border text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              View All Tasks <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* New Leads Widget */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" /> New Leads (Last 24h)
              </h2>
              <Link
                to="/inbox"
                className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3" id="new-leads-list">
              {newLeadsData.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {lead.full_name ? lead.full_name.charAt(0) : 'L'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {lead.full_name || 'Unknown Lead'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sourceConfig[lead.source] || lead.source} • {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {newLeadsData.length === 0 && <p className="text-center text-muted-foreground py-4">No new leads in the last 24h!</p>}
            </div>
            <Link
              to="/inbox"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-border text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              View All Leads <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Scheduled Posts Widget */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" /> Scheduled Posts
              </h2>
              <Link
                to="/planner"
                className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="scheduled-posts-list">
              {scheduledPostsData.map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {post.listings ? post.listings.address : 'Unknown Listing'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {platformConfig[post.type.replace('post_', '')] || post.type.replace('post_', '')}
                      </p>
                    </div>
                    <div className="inline-flex px-2.5 py-1 bg-primary/10 rounded-full">
                      <span className="text-xs font-semibold text-primary">
                        {platformConfig[post.type.replace('post_', '')] || post.type.replace('post_', '')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.due_at).toLocaleDateString()} {new Date(post.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
              {scheduledPostsData.length === 0 && <p className="text-center text-muted-foreground py-4 md:col-span-2">No scheduled posts!</p>}
            </div>
            <Link
              to="/planner"
              className="mt-6 flex items-center justify-center gap-2 py-3 w-full rounded-lg border-2 border-border text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              View All Posts <ArrowRight className="w-4 h-4" />
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