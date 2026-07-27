import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  ClipboardList,
  Share2,
  Plus,
  Phone,
  Check,
  AlertCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { usePendingTasks } from "@/hooks/usePendingTasks";

// --- INTERFACES (Matching Supabase Schema) ---
interface SupabaseTask {
  id: string;
  org_id: string;
  lead_id: string | null;
  listing_id: string | null;
  due_at: string; // ISO string
  status: string; // 'pending', 'completed', 'snoozed', 'cancelled'
  type: string; // 'follow_up_24h', 'inspection_book', 'post_facebook', etc.
  title: string;
  description: string | null;
  payload_json: any;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
  listings?: { address: string } | null; // For joined listing address
}


// --- CONFIGS for Task/Post Types ---
const taskTypeConfig: { [key: string]: { bg: string; text: string; label: string; icon: React.ElementType } } = {
  "follow_up_24h": { bg: "bg-blue-900/40", text: "text-blue-300", label: "Follow-up", icon: Clock },
  "inspection_book": { bg: "bg-purple-900/40", text: "text-purple-300", label: "Inspection", icon: CalendarIcon },
  "send_contract": { bg: "bg-orange-900/40", text: "text-orange-300", label: "Contract", icon: ClipboardList },
  "post_facebook": { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "Post FB", icon: Share2 },
  "post_instagram": { bg: "bg-pink-900/40", text: "text-pink-300", label: "Post IG", icon: Share2 },
  "call": { bg: "bg-yellow-900/40", text: "text-yellow-300", label: "Call", icon: Phone },
  // Add more as needed based on your 'tasks.type' enum/values
};

export default function Planner() {
  const { tasks, loading, error, markDone } = usePendingTasks();
  const [todayItems, setTodayItems] = useState<typeof tasks>([]);
  const [upcomingItems, setUpcomingItems] = useState<typeof tasks>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Separate tasks into today and upcoming
  useEffect(() => {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const taskForToday: typeof tasks = [];
    const upcomingTasks: typeof tasks = [];

    tasks.forEach((task) => {
      const dueDate = new Date(task.due_at);
      if (dueDate >= todayStart && dueDate < tomorrowStart) {
        taskForToday.push(task);
      } else if (dueDate >= tomorrowStart) {
        upcomingTasks.push(task);
      }
    });

    setTodayItems(taskForToday);
    setUpcomingItems(upcomingTasks);
  }, [tasks]);

  const handleMarkDone = async (id: string) => {
    setCompletingId(id);
    try {
      await markDone(id);
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto p-6 text-center text-muted-foreground">
          Loading tasks...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={true}>
      <div className="max-w-screen-2xl mx-auto p-3 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-0 mb-4 md:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planner</h1>
          <button
            // onClick={() => setShowNewTaskForm(true)} // Future: Add task form
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm md:text-base touch-manipulation w-full sm:w-auto"
            disabled // Placeholder for now
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Today's Schedule - Responsive */}
        <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm mb-4 md:mb-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" /> Today
              {todayItems.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full">
                  {todayItems.length}
                </span>
              )}
            </h2>
          </div>
          <div className="space-y-3">
            {todayItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No items scheduled for today!</p>
            ) : (
              todayItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 md:gap-4 p-3 md:p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors group"
                >
                  <div
                    className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${taskTypeConfig[item.type]?.bg || 'bg-gray-50'
                      } ${taskTypeConfig[item.type]?.text || 'text-gray-700'}`}
                  >
                    {taskTypeConfig[item.type]?.label || item.type.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm md:text-base text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                      {item.leads?.[0]?.full_name && `Lead: ${item.leads[0].full_name}`}
                      {item.description && ` - ${item.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
                      {new Date(item.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                      onClick={() => handleMarkDone(item.id)}
                      disabled={completingId === item.id}
                      className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors opacity-0 group-hover:opacity-100"
                      title="Mark as done"
                    >
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Schedule - Responsive */}
        <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" /> Upcoming
              {upcomingItems.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full">
                  {upcomingItems.length}
                </span>
              )}
            </h2>
          </div>
          <div className="space-y-2 md:space-y-3">
            {upcomingItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No upcoming items scheduled.</p>
            ) : (
              upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 md:gap-4 p-3 md:p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors group"
                >
                  <div
                    className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${taskTypeConfig[item.type]?.bg || 'bg-gray-50'
                      } ${taskTypeConfig[item.type]?.text || 'text-gray-700'}`}
                  >
                    {taskTypeConfig[item.type]?.label || item.type.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm md:text-base text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                      {item.leads?.[0]?.full_name && `Lead: ${item.leads[0].full_name}`}
                      {item.description && ` - ${item.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
                      <span className="hidden md:inline">{new Date(item.due_at).toLocaleDateString()} </span>
                      {new Date(item.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                      onClick={() => handleMarkDone(item.id)}
                      disabled={completingId === item.id}
                      className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors opacity-0 group-hover:opacity-100"
                      title="Mark as done"
                    >
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
