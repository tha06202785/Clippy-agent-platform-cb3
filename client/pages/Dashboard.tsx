import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Users,
  Share2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Layout from "@/components/Layout";
import { getCurrentUser } from "@/lib/auth";

interface Task {
  id: string;
  title: string;
  type: "follow-up" | "inspection" | "call";
  leadName: string;
  dueTime: string;
}

interface Lead {
  id: string;
  name: string;
  source: "web" | "phone" | "email";
  lastContact: string;
}

interface ScheduledPost {
  id: string;
  listingAddress: string;
  platform: "facebook" | "instagram" | "twitter";
  scheduledTime: string;
}

// Mock data
const todaysTasks: Task[] = [
  {
    id: "1",
    title: "Follow up with John Doe",
    type: "follow-up",
    leadName: "John Doe",
    dueTime: "2:00 PM",
  },
  {
    id: "2",
    title: "Post to Facebook for 123 Main St",
    type: "call",
    leadName: "123 Main St",
    dueTime: "3:30 PM",
  },
  {
    id: "3",
    title: "Schedule inspection",
    type: "inspection",
    leadName: "Sarah Johnson",
    dueTime: "4:00 PM",
  },
];

const newLeads: Lead[] = [
  {
    id: "1",
    name: "Jane Smith",
    source: "web",
    lastContact: "Today at 10:30 AM",
  },
  {
    id: "2",
    name: "Mike Wilson",
    source: "phone",
    lastContact: "Today at 9:15 AM",
  },
  {
    id: "3",
    name: "Emma Davis",
    source: "email",
    lastContact: "Today at 8:45 AM",
  },
];

const scheduledPosts: ScheduledPost[] = [
  {
    id: "1",
    listingAddress: "456 Oak Avenue",
    platform: "facebook",
    scheduledTime: "Tomorrow 10:00 AM",
  },
  {
    id: "2",
    listingAddress: "789 Elm Street",
    platform: "instagram",
    scheduledTime: "Tomorrow 2:00 PM",
  },
];

const typeConfig = {
  "follow-up": { bg: "bg-blue-50", text: "text-blue-700", label: "Follow-up" },
  call: { bg: "bg-green-50", text: "text-green-700", label: "Call" },
  inspection: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    label: "Inspection",
  },
};

const sourceConfig = {
  web: "Web Form",
  phone: "Phone",
  email: "Email",
};

const platformConfig = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter",
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };

    checkUser();
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
            Welcome back, {user?.email?.split("@")[0] || "Agent"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what you need to focus on today
          </p>

          {/* User Info Debug Box */}
          <div className="mt-6 p-4 bg-clippy-50 border border-primary/20 rounded-lg text-sm">
            <p className="text-foreground font-semibold mb-2">Your Account Details:</p>
            <div className="space-y-1 text-muted-foreground font-mono text-xs">
              <p><span className="font-semibold">Email:</span> {user?.email}</p>
              <p><span className="font-semibold">User ID:</span> {user?.id}</p>
              <p><span className="font-semibold">Status:</span> ✓ Logged In</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Check your Supabase dashboard under Authentication → Users to see this account.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Tasks Today"
            value={todaysTasks.length}
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
              {todaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      typeConfig[task.type].bg
                    } ${typeConfig[task.type].text}`}
                  >
                    {typeConfig[task.type].label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.leadName}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {task.dueTime}
                  </div>
                </div>
              ))}
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
              {newLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {lead.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sourceConfig[lead.source]} • {lead.lastContact}
                    </p>
                  </div>
                </div>
              ))}
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
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {post.listingAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {platformConfig[post.platform]}
                      </p>
                    </div>
                    <div className="inline-flex px-2.5 py-1 bg-primary/10 rounded-full">
                      <span className="text-xs font-semibold text-primary">
                        {platformConfig[post.platform]}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {post.scheduledTime}
                  </p>
                </div>
              ))}
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
