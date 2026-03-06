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
  Radio,
  Activity,
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
  const [animatedMetrics, setAnimatedMetrics] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  });
  const navigate = useNavigate();

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
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

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

        try {
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

  useEffect(() => {
    if (!loading && (tasksToday.length > 0 || newLeads.length > 0)) {
      animateNumberCountUp(0, tasksToday.length);
      animateNumberCountUp(1, newLeads.length);
      animateNumberCountUp(2, scheduledPosts.length);
      animateNumberCountUp(3, 125);
    }
  }, [loading]);

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
      {/* ANIMATED RADAR GRID BACKGROUND */}
      <div className="fixed inset-0 -z-30 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-[0.08] animate-pulse" preserveAspectRatio="none" style={{ animationDuration: "6s" }}>
          <defs>
            <pattern id="dashboard-radar-grid" x="50" y="50" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="25" fill="none" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
              <circle cx="25" cy="25" r="15" fill="none" stroke="#0ea5e9" strokeWidth="0.6" opacity="0.5" />
              <circle cx="25" cy="25" r="5" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.8" />
              <line x1="0" y1="25" x2="50" y2="25" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" />
              <line x1="25" y1="0" x2="25" y2="50" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" />
              <circle cx="25" cy="25" r="2" fill="#0ea5e9" opacity="0.9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dashboard-radar-grid)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-pulse" style={{ animationDuration: "8s" }} />
      </div>

      {/* FLOATING AI SUGGESTS BOX */}
      {newLeads.length > 0 && (
        <div className="fixed top-32 right-8 max-w-sm z-50 animate-in slide-in-from-right-8 duration-700 pointer-events-auto">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/60 via-blue-500/60 to-cyan-500/60 rounded-3xl blur-3xl opacity-80 group-hover:opacity-100 animate-pulse transition-opacity" style={{ animationDuration: "2.5s" }} />
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/40 via-blue-400/30 to-cyan-400/40 rounded-3xl blur-2xl opacity-60 animate-pulse transition-opacity" style={{ animationDuration: "4s" }} />
            
            <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 rounded-3xl p-6 border-2 border-cyan-400/80 group-hover:border-cyan-200 shadow-3xl shadow-cyan-500/50 group-hover:shadow-cyan-400/70 transition-all duration-300 backdrop-blur-xl active:scale-95">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-3 bg-gradient-to-br from-cyan-400/50 to-blue-500/50 rounded-2xl mt-0.5 animate-pulse border-2 border-cyan-300/80 shadow-lg shadow-cyan-400/40" style={{ animationDuration: "1.5s" }}>
                    <Sparkles className="w-6 h-6 text-cyan-100 drop-shadow-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-cyan-200 uppercase tracking-widest drop-shadow-lg">
                      🎯 AI SUGGESTS
                    </p>
                    <p className="text-base font-black text-white mt-2 drop-shadow-lg">
                      {newLeads.length} hot {newLeads.length === 1 ? "lead" : "leads"} to follow up
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <ArrowRight className="w-6 h-6 text-cyan-200 flex-shrink-0 group-hover:translate-x-3 group-active:translate-x-1 transition-transform drop-shadow-lg font-black" />
                </div>
              </div>
              
              <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-0 group-hover:opacity-40">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" style={{ animationDuration: "3s" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10 px-3 md:px-4">
        {/* Header with Hero Section - Responsive */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
            AI-powered dashboard
          </p>

          {/* Premium Hero Card - AI Focus Today - Responsive */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl group mb-6 md:mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/60 via-blue-500/60 to-cyan-500/60 rounded-2xl md:rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 animate-pulse transition-opacity" style={{ animationDuration: "4s" }} />

            <div className="relative bg-gradient-to-br from-slate-900/95 via-blue-900/80 to-slate-950/95 rounded-2xl md:rounded-3xl p-5 md:p-12 border-2 border-cyan-400/80 group-hover:border-cyan-300 shadow-2xl shadow-cyan-500/40 group-hover:shadow-cyan-500/60 transition-all duration-300 backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/25 rounded-full blur-3xl -z-10 animate-pulse hidden md:block" style={{ animationDuration: "7s" }} />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl -z-10 animate-pulse hidden md:block" style={{ animationDuration: "9s", animationDelay: "1s" }} />

              <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-6">
                <div className="w-full md:w-auto">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <div className="p-1.5 md:p-2 bg-gradient-to-br from-cyan-400/50 to-blue-500/50 rounded-lg border border-cyan-300/60 shadow-lg shadow-cyan-400/40 flex-shrink-0">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-100 animate-pulse" style={{ animationDuration: "1.5s" }} />
                    </div>
                    <span className="text-xs md:text-sm font-black text-cyan-200 uppercase tracking-widest drop-shadow-lg">
                      🚀 AI
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-3 md:mb-4 drop-shadow-lg">
                    Your Focus Today
                  </h2>
                  <p className="text-cyan-100/80 mb-4 md:mb-8 max-w-lg font-semibold text-sm md:text-lg drop-shadow line-clamp-3">
                    {newLeads.length > 0
                      ? `🎯 ${newLeads.length} hot ${newLeads.length === 1 ? "lead" : "leads"} waiting`
                      : tasksToday.length > 0
                      ? `📋 ${tasksToday.length} tasks today`
                      : "✅ All set!"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
                    {newLeads.length > 0 && (
                      <Link
                        to="/inbox"
                        className="group/btn relative inline-flex items-center justify-center gap-2 px-5 md:px-8 py-2.5 md:py-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 text-slate-900 rounded-xl md:rounded-2xl font-black text-xs md:text-base transition-all duration-300 hover:shadow-3xl hover:shadow-cyan-500/70 hover:scale-105 md:hover:scale-110 active:scale-95 border-2 border-cyan-300/80 group-hover/btn:border-cyan-100 touch-manipulation flex-1 sm:flex-none"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/50 to-blue-500/50 rounded-xl md:rounded-2xl blur-xl opacity-60 group-hover/btn:opacity-100 -z-10 animate-pulse" />
                        <Target className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:rotate-12 transition-transform" />
                        <span className="hidden sm:inline">Action Lead</span>
                        <span className="sm:hidden">Action</span>
                        <ArrowRight className="w-3.5 h-3.5 md:w-5 md:h-5 group-hover/btn:translate-x-2 transition-transform" />
                      </Link>
                    )}
                    <Link
                      to="/ai-radar"
                      className="group/btn2 relative inline-flex items-center justify-center gap-2 px-5 md:px-8 py-2.5 md:py-4 bg-gradient-to-br from-slate-800/80 to-blue-900/60 text-cyan-300 rounded-xl md:rounded-2xl font-bold text-xs md:text-base border-2 border-cyan-400/70 group-hover/btn2:border-cyan-300 hover:bg-gradient-to-br hover:from-slate-700 hover:to-blue-800 transition-all group-hover/btn2:shadow-2xl group-hover/btn2:shadow-cyan-500/50 active:scale-95 backdrop-blur-sm touch-manipulation flex-1 sm:flex-none"
                    >
                      <Zap className="w-4 h-4 md:w-5 md:h-5 group-hover/btn2:scale-125 transition-transform" />
                      <span className="hidden sm:inline">AI Radar</span>
                      <span className="sm:hidden">Radar</span>
                      <ArrowRight className="w-3.5 h-3.5 md:w-5 md:h-5 group-hover/btn2:translate-x-2 transition-transform" />
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:flex flex-col items-center justify-center flex-shrink-0">
                  <div className="relative w-32 h-32 lg:w-40 lg:h-40">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/40 to-transparent animate-spin" style={{ animationDuration: "8s" }} />
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-transparent animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 lg:w-20 lg:h-20 text-cyan-300 opacity-80 animate-pulse" style={{ animationDuration: "2s" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Info Box - Responsive */}
          {usingSampleData && (
            <div className="p-3 md:p-4 bg-cyan-600/20 border border-cyan-500/40 rounded-lg text-xs md:text-sm mb-4 md:mb-6 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-cyan-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-cyan-200 font-semibold">Demo Mode</p>
                  <p className="text-cyan-300/70 text-xs mt-0.5">
                    Sample data. Connect Supabase for real data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Snapshot - Stats Row - Responsive */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-0 mb-4 md:mb-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white flex items-center gap-2 md:gap-3 drop-shadow-lg">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-cyan-500/50 to-blue-600/40 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/40 flex-shrink-0">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-cyan-300" />
              </div>
              <span>Performance</span>
            </h2>
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600/60 to-red-500/60 rounded-full blur-lg opacity-70 animate-pulse" style={{ animationDuration: "1.5s" }} />
              <div className="relative flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-red-600/70 to-red-700/60 border-2 border-red-400/90 rounded-full animate-pulse backdrop-blur-sm shadow-2xl shadow-red-600/50" style={{ animationDuration: "2s" }}>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-300 animate-pulse shadow-lg shadow-red-400" style={{ animationDuration: "1s" }} />
                <span className="text-xs md:text-sm font-black text-red-100 drop-shadow">🔴 LIVE</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Tasks Today"
              displayValue={animatedMetrics[0] || 0}
              value={tasksToday.length}
              icon={CheckCircle2}
              color="from-blue-500 to-blue-600"
              change={tasksToday.length > 0 ? 5 : -2}
              index={0}
            />
            <StatCard
              title="New Leads"
              displayValue={animatedMetrics[1] || 0}
              value={newLeads.length}
              icon={Users}
              color="from-green-500 to-green-600"
              change={newLeads.length > 0 ? 12 : 0}
              index={1}
            />
            <StatCard
              title="Scheduled Posts"
              displayValue={animatedMetrics[2] || 0}
              value={scheduledPosts.length}
              icon={Share2}
              color="from-purple-500 to-purple-600"
              change={scheduledPosts.length > 2 ? 8 : 0}
              index={2}
            />
            <StatCard
              title="Conversion Rate"
              displayValue={(animatedMetrics[3] || 0) / 10}
              value={12.5}
              icon={TrendingUp}
              color="from-orange-500 to-orange-600"
              change={2.3}
              index={3}
              isPercentage={true}
            />
          </div>
        </div>

        {/* Market Pulse - Alerts Feed - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 md:mb-6 flex items-center gap-2 md:gap-3 drop-shadow-lg">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-orange-500/50 to-red-600/40 rounded-lg border border-orange-400/80 shadow-lg shadow-orange-500/40 flex-shrink-0">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-orange-200 animate-pulse" style={{ animationDuration: "1.2s" }} />
              </div>
              <span className="truncate">Market Pulse</span>
            </h2>
            <div className="space-y-3 md:space-y-4">
              <div className="group relative overflow-hidden rounded-2xl border-2 border-orange-500/50 group-hover:border-orange-400 backdrop-blur-sm cursor-pointer hover:md:scale-105 hover:md:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500 transition-all touch-manipulation" style={{ background: "linear-gradient(135deg, rgba(124, 45, 18, 0.3) 0%, rgba(154, 52, 18, 0.1) 100%)", boxShadow: "0 0 40px rgba(249, 115, 22, 0.3)" }}>
                <div className="absolute left-0 top-0 bottom-0 w-1.5 group-hover:w-2 transition-all bg-orange-500 opacity-0 group-hover:opacity-100 shadow-lg" />
                <div className="relative p-4 md:p-6 flex items-start gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-orange-600/40 rounded-xl group-hover:scale-110 transition-transform border border-orange-400/40 shadow-lg shadow-orange-500/30 flex-shrink-0">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-orange-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm md:text-base drop-shadow">
                      Suburb Prices Up 2.3%
                    </p>
                    <p className="text-xs md:text-sm text-orange-200/70 mt-1 md:mt-2 drop-shadow line-clamp-2">
                      Eastern suburbs momentum
                    </p>
                  </div>
                  <span className="text-xs md:text-sm text-emerald-200 font-black px-2.5 md:px-4 py-1 md:py-2 bg-emerald-600/60 rounded-full whitespace-nowrap shadow-lg shadow-emerald-500/30 drop-shadow flex-shrink-0">
                    +2.3%
                  </span>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border-2 border-blue-500/50 group-hover:border-blue-400 backdrop-blur-sm cursor-pointer hover:md:scale-105 hover:md:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500 transition-all touch-manipulation" style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(59, 130, 246, 0.1) 100%)", boxShadow: "0 0 40px rgba(59, 130, 246, 0.3)", animationDelay: "100ms" }}>
                <div className="absolute left-0 top-0 bottom-0 w-1.5 group-hover:w-2 transition-all bg-blue-500 opacity-0 group-hover:opacity-100 shadow-lg" />
                <div className="relative p-4 md:p-6 flex items-start gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-blue-600/40 rounded-xl group-hover:scale-110 transition-transform border border-blue-400/40 shadow-lg shadow-blue-500/30 flex-shrink-0">
                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm md:text-base drop-shadow">
                      Open House Guide
                    </p>
                    <p className="text-xs md:text-sm text-blue-200/70 mt-1 md:mt-2 drop-shadow line-clamp-2">
                      Weekend showing tips
                    </p>
                  </div>
                  <span className="text-xs md:text-sm text-blue-200 font-black px-2.5 md:px-4 py-1 md:py-2 bg-blue-600/60 rounded-full whitespace-nowrap shadow-lg shadow-blue-500/30 drop-shadow flex-shrink-0">
                    Guide
                  </span>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border-2 border-purple-500/50 group-hover:border-purple-400 backdrop-blur-sm cursor-pointer hover:md:scale-105 hover:md:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500 transition-all touch-manipulation" style={{ background: "linear-gradient(135deg, rgba(126, 34, 206, 0.3) 0%, rgba(147, 51, 234, 0.1) 100%)", boxShadow: "0 0 40px rgba(168, 85, 247, 0.3)", animationDelay: "200ms" }}>
                <div className="absolute left-0 top-0 bottom-0 w-1.5 group-hover:w-2 transition-all bg-purple-500 opacity-0 group-hover:opacity-100 shadow-lg" />
                <div className="relative p-4 md:p-6 flex items-start gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-purple-600/40 rounded-xl group-hover:scale-110 transition-transform border border-purple-400/40 shadow-lg shadow-purple-500/30 flex-shrink-0">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm md:text-base drop-shadow">
                      Demand: 3BR Homes
                    </p>
                    <p className="text-xs md:text-sm text-purple-200/70 mt-1 md:mt-2 drop-shadow line-clamp-2">
                      +15% inquiry surge
                    </p>
                  </div>
                  <span className="text-xs md:text-sm text-purple-200 font-black px-2.5 md:px-4 py-1 md:py-2 bg-purple-600/60 rounded-full whitespace-nowrap shadow-lg shadow-purple-500/30 drop-shadow flex-shrink-0">
                    Hot
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Card - Responsive */}
          <div className="relative overflow-hidden rounded-2xl group animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/40 via-blue-500/30 to-cyan-500/40 rounded-2xl blur-2xl opacity-0 group-hover:opacity-60 -z-10 transition-opacity" />
            <div className="relative bg-gradient-to-br from-slate-800/90 to-blue-900/70 rounded-2xl border-2 border-cyan-400/60 group-hover:border-cyan-300 p-5 md:p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-all duration-300">
              <div>
                <h3 className="font-black text-white mb-4 md:mb-8 text-xl md:text-2xl drop-shadow-lg">Your Metrics</h3>
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-xs md:text-sm text-cyan-200/80 font-bold uppercase tracking-widest drop-shadow">Response</span>
                      <span className="text-base md:text-lg font-black text-cyan-300 drop-shadow">87%</span>
                    </div>
                    <div className="w-full h-2 md:h-3 bg-slate-700/60 rounded-full overflow-hidden border-2 border-cyan-400/30 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse" style={{ width: "87%", animationDuration: "3s" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-xs md:text-sm text-cyan-200/80 font-bold uppercase tracking-widest drop-shadow">Completion</span>
                      <span className="text-base md:text-lg font-black text-cyan-300 drop-shadow">72%</span>
                    </div>
                    <div className="w-full h-2 md:h-3 bg-slate-700/60 rounded-full overflow-hidden border-2 border-cyan-400/30 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/50 animate-pulse" style={{ width: "72%", animationDuration: "3s", animationDelay: "0.5s" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-xs md:text-sm text-cyan-200/80 font-bold uppercase tracking-widest drop-shadow">Conversion</span>
                      <span className="text-base md:text-lg font-black text-cyan-300 drop-shadow">12.5%</span>
                    </div>
                    <div className="w-full h-2 md:h-3 bg-slate-700/60 rounded-full overflow-hidden border-2 border-cyan-400/30 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/50 animate-pulse" style={{ width: "12.5%", animationDuration: "3s", animationDelay: "1s" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t-2 border-cyan-400/30">
                <p className="text-xs text-cyan-200/70 mb-2 md:mb-4 font-black uppercase tracking-widest drop-shadow">✨ AI Powered</p>
                <Link
                  to="/ai-radar"
                  className="group/insights w-full inline-flex items-center justify-center gap-2 px-4 py-3 md:py-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 text-slate-900 rounded-lg md:rounded-xl text-xs md:text-sm font-black hover:shadow-2xl hover:shadow-cyan-500/60 hover:scale-105 active:scale-95 transition-all border border-cyan-300/80 group-hover/insights:border-cyan-200 touch-manipulation"
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 group-hover/insights:rotate-12 transition-transform" />
                  AI Insights
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Today's Tasks Widget */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 hover:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative p-8 z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-white flex items-center gap-3 drop-shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/40 to-blue-600/30 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/30">
                    <Clock className="w-6 h-6 text-cyan-300" />
                  </div>
                  Today's Tasks
                </h2>
                <Link
                  to="/planner"
                  className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-bold uppercase tracking-widest"
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
          </div>

          {/* New Leads Widget */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 hover:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-right-4 duration-500" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)" }}>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative p-8 z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-white flex items-center gap-3 drop-shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/40 to-blue-600/30 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/30">
                    <Users className="w-6 h-6 text-cyan-300" />
                  </div>
                  New Leads (Last 24h)
                </h2>
                <Link
                  to="/inbox"
                  className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-bold uppercase tracking-widest"
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
          </div>

          {/* Scheduled Posts Widget */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 hover:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:col-span-2" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative p-8 z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-white flex items-center gap-3 drop-shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/40 to-blue-600/30 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/30">
                    <Share2 className="w-6 h-6 text-cyan-300" />
                  </div>
                  Scheduled Posts
                </h2>
                <Link
                  to="/planner"
                  className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-bold uppercase tracking-widest"
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
      </div>
    </Layout>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  displayValue?: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: number;
  index?: number;
  isPercentage?: boolean;
}

function StatCard({ title, value, displayValue, icon: Icon, color, change, index, isPercentage }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const actualDisplayValue = displayValue !== undefined ? displayValue : value;

  // For percentage display, split into main number and % sign
  const displayString = String(actualDisplayValue);
  const isWholeNumber = Number.isInteger(actualDisplayValue);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/60 hover:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)",
        animationDelay: index ? `${index * 100}ms` : "0ms",
        boxShadow: "0 0 20px rgba(6, 182, 212, 0.2)"
      }}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />

      <div className="relative p-8 z-10">
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <p className="text-sm text-cyan-200/80 font-bold mb-3 uppercase tracking-widest drop-shadow">
              {title}
            </p>
            <div className="flex items-center gap-4">
              {isPercentage ? (
                <div className="relative inline-flex items-center">
                  {/* Main percentage number with glow */}
                  <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.5)] tabular-nums">
                    {displayString}
                  </span>
                  {/* % sign - smaller, superscript-like, lighter */}
                  <span className="text-lg md:text-xl font-bold text-cyan-300/80 ml-1 relative -top-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                    %
                  </span>
                </div>
              ) : (
                <p className="text-4xl md:text-5xl font-black text-cyan-300 tabular-nums drop-shadow-lg">
                  {actualDisplayValue}
                </p>
              )}
              {change !== undefined && (
                <div
                  className={`text-sm font-black px-3 py-2 rounded-full font-mono transition-all duration-300 border border-white/30 backdrop-blur-sm ${
                    isPositive
                      ? "bg-emerald-500/30 text-emerald-200 shadow-lg shadow-emerald-500/30"
                      : isNegative
                      ? "bg-red-500/30 text-red-200 shadow-lg shadow-red-500/30"
                      : "bg-slate-500/30 text-slate-200 shadow-lg shadow-slate-500/30"
                  }`}
                >
                  {isPositive ? "↑" : isNegative ? "↓" : "→"} {Math.abs(change)}%
                </div>
              )}
            </div>
          </div>
          <div className={`bg-gradient-to-br ${color} p-4 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 border border-white/20`}>
            <Icon className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t-2 border-cyan-400/30 group-hover:border-cyan-400/60 transition-colors duration-300">
          <svg
            viewBox="0 0 100 40"
            className="w-full h-16 opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"
            preserveAspectRatio="none"
            style={{ animationDuration: "3s" }}
          >
            <defs>
              <linearGradient id={`dashboard-sparkline-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
              </linearGradient>
              <filter id={`glow-dashboard-sparkline-${index}`}>
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            <path
              d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
              filter={`url(#glow-dashboard-sparkline-${index})`}
            />
            
            <path
              d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10}`}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            
            <path
              d={`M0,${30 - Math.random() * 10} Q25,${15 + Math.random() * 10} 50,${20 + Math.random() * 10} T100,${25 - Math.random() * 10} L100,40 L0,40 Z`}
              fill={`url(#dashboard-sparkline-${index})`}
              opacity="0.7"
            />
          </svg>
        </div>

        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
      </div>
    </div>
  );
}
