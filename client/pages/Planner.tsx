import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  ClipboardList,
  Share2,
  Plus,
  Phone,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

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

interface SupabaseListing {
  id: string;
  address: string;
  // Add other fields from listings table if needed for display
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
  const [todayItems, setTodayItems] = useState<SupabaseTask[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<SupabaseTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Effect to fetch user's org_id
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
          console.warn("No org role found, using default:", orgError.message);
          setUserOrgId("default");
        } else if (data) {
          setUserOrgId(data.org_id);
        } else {
          setUserOrgId("default");
        }
      } catch (err) {
        console.error("Error fetching org_id:", err);
        setUserOrgId("default");
      }
    };
    fetchUserOrgId();
  }, [navigate]);

  // Effect to fetch planner items
  useEffect(() => {
    const fetchPlannerItems = async () => {
      if (!userOrgId) return; // Wait until org_id is available

      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        navigate("/login"); // Redirect to login if not authenticated
        return;
      }

      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      // Fetch all relevant tasks (including scheduled posts)
      const { data: fetchedTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*, listings(address)") // Select tasks and join listing address
        .eq("org_id", userOrgId)
        .eq("assigned_to_user_id", userId)
        .gte("due_at", now.toISOString()) // Only future or current items
        .order("due_at", { ascending: true });

      if (tasksError) {
        console.error("Error fetching planner items:", tasksError);
        setError("Failed to load planner items.");
        setLoading(false);
        return;
      }

      const tasksForToday: SupabaseTask[] = [];
      const upcomingTasks: SupabaseTask[] = [];

      (fetchedTasks || []).forEach((task) => {
        const dueDate = new Date(task.due_at);
        if (dueDate >= todayStart && dueDate < tomorrowStart) {
          tasksForToday.push(task);
        } else if (dueDate >= tomorrowStart) {
          upcomingTasks.push(task);
        }
      });

      setTodayItems(tasksForToday);
      setUpcomingItems(upcomingTasks);
      setLoading(false);
    };

    fetchPlannerItems();
  }, [userOrgId, navigate]); // Re-fetch when org_id changes

  if (loading && !userOrgId) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto p-6 text-center text-muted-foreground">
          Initializing Planner...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto p-6 text-center text-red-500">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={true}>
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Planner</h1>
          <button
            // onClick={() => setShowNewTaskForm(true)} // Future: Add task form
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            disabled // Placeholder for now
          >
            <Plus className="w-5 h-5" /> New Task / Post
          </button>
        </div>

        {/* Today's Schedule */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" /> Today's Schedule
            </h2>
          </div>
          <div className="space-y-3">
            {todayItems.length === 0 && !loading ? (
              <p className="text-center text-muted-foreground py-4">No items scheduled for today!</p>
            ) : (
              todayItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${taskTypeConfig[item.type]?.bg || 'bg-gray-50'
                      } ${taskTypeConfig[item.type]?.text || 'text-gray-700'}`}
                  >
                    {taskTypeConfig[item.type]?.label || item.type.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.listing_id && item.listings?.address ? `Listing: ${item.listings.address}` : ''}
                      {item.lead_id ? ` Lead: ${item.lead_id.substring(0, 8)}...` : ''}
                      {item.description && ` - ${item.description}`}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {new Date(item.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" /> Upcoming
            </h2>
          </div>
          <div className="space-y-3">
            {upcomingItems.length === 0 && !loading ? (
              <p className="text-center text-muted-foreground py-4">No upcoming items scheduled.</p>
            ) : (
              upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${taskTypeConfig[item.type]?.bg || 'bg-gray-50'
                      } ${taskTypeConfig[item.type]?.text || 'text-gray-700'}`}
                  >
                    {taskTypeConfig[item.type]?.label || item.type.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.listing_id && item.listings?.address ? `Listing: ${item.listings.address}` : ''}
                      {item.lead_id ? ` Lead: ${item.lead_id.substring(0, 8)}...` : ''}
                      {item.description && ` - ${item.description}`}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {new Date(item.due_at).toLocaleDateString()} at {new Date(item.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
