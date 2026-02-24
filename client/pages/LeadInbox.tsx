import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  MessageSquare,
  ClipboardList,
  Mail,
  Phone,
  Tag,
  Clock,
  Send,
  Sparkles,
  Paperclip,
  Calendar,
  DollarSign,
  Info,
  Check,
  Edit,
  Trash,
  Plus,
} from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Project URL and Anon Key ---
const SUPABASE_URL = "https://mqydieqeybgxtjqogrwh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fgi9j879wWGlzEQbt0i7Yw_D7rYZG3g";
// -----------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- INTERFACES (Matching Supabase Schema) ---
interface Lead {
  id: string;
  org_id: string;
  primary_channel: string | null;
  source: string;
  status: string; // e.g., 'new', 'qualified', 'contacted'
  stage: string; // e.g., 'inquiry', 'viewing', 'offer'
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

interface Conversation {
  id: string;
  org_id: string;
  lead_id: string;
  channel: string; // e.g., 'email', 'whatsapp', 'facebook_messenger'
  external_thread_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  org_id: string;
  conversation_id: string;
  direction_in_out: "in" | "out";
  text: string | null;
  raw_json: any;
  created_at: string;
}

interface LeadEvent {
  id: string;
  org_id: string;
  lead_id: string;
  event_type: string; // lead_event_type enum
  payload_json: any;
  created_at: string;
}

interface Listing {
  id: string;
  address: string;
  price_display: string | null;
  status: string;
  // ... other relevant listing fields for display
}

// --- Status/Stage/Channel Configs for UI ---
const leadStatusConfig: { [key: string]: string } = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  archived: "Archived",
};

const leadStageConfig: { [key: string]: string } = {
  inquiry: "Inquiry",
  viewing: "Viewing Arranged",
  offer: "Offer Made",
  sold: "Sold",
  lost: "Lost",
};

const channelConfig: { [key: string]: { icon: React.ElementType; color: string } } = {
  email: { icon: Mail, color: "text-blue-500" },
  phone: { icon: Phone, color: "text-green-500" },
  instagram: { icon: MessageSquare, color: "text-purple-500" },
  facebook: { icon: MessageSquare, color: "text-blue-700" },
  whatsapp: { icon: MessageSquare, color: "text-green-600" },
  // Add more as needed
};

export default function LeadInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<(Message | LeadEvent)[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- Filter and Sort States ---
  const [filterStatus, setFilterStatus] = useState("all"); // 'new', 'active', 'hot', 'unreplied', 'all'
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError(null);

      const userSession = await supabase.auth.getSession();
      const userId = userSession.data.session?.user?.id;

      if (!userId) {
        navigate("/signup"); // Redirect to login if not authenticated
        return;
      }

      let query = supabase
        .from("leads")
        .select("*")
        .eq("assigned_to_user_id", userId)
        .order("last_contact_at", { ascending: false });

      // Apply filters
      if (filterStatus === "new") {
        query = query.eq("status", "new");
      } else if (filterStatus === "active") {
        query = query.in("status", ["new", "qualified", "contacted"]);
      }
      // 'hot' and 'unreplied' would need more complex RLS/computed columns or client-side filtering after fetch

      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching leads:", fetchError);
        setError("Failed to load leads.");
      } else {
        setLeads(data || []);
      }
      setLoading(false);
    };

    fetchLeads();
  }, [filterStatus, searchTerm, navigate]); // Re-fetch when filters change

  useEffect(() => {
    const fetchLeadDetails = async () => {
      if (!selectedLead) {
        setMessages([]);
        setConversations([]);
        return;
      }

      setLoading(true);
      setError(null);

      // Fetch conversations for the selected lead
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("lead_id", selectedLead.id)
        .order("last_message_at", { ascending: false });

      if (convError) {
        console.error("Error fetching conversations:", convError);
        setError("Failed to load conversations.");
        setLoading(false);
        return;
      }
      setConversations(convData || []);

      // Fetch all messages and events for the selected lead (can combine or fetch separately)
      // For simplicity, fetching messages from the first conversation for now
      let allTimelineItems: (Message | LeadEvent)[] = [];
      if (convData && convData.length > 0) {
        const { data: msgData, error: msgError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convData[0].id) // Assuming focusing on first conversation for now
          .order("created_at", { ascending: true });
        if (msgError) {
          console.error("Error fetching messages:", msgError);
          setError("Failed to load messages.");
        } else {
          allTimelineItems = [...(msgData || [])];
        }
      }

      const { data: eventData, error: eventError } = await supabase
        .from("lead_events")
        .select("*")
        .eq("lead_id", selectedLead.id)
        .order("created_at", { ascending: true });

      if (eventError) {
        console.error("Error fetching events:", eventError);
        setError("Failed to load events.");
      } else {
        allTimelineItems = [...allTimelineItems, ...(eventData || [])];
      }

      // Sort all timeline items by created_at
      allTimelineItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(allTimelineItems);

      setLoading(false);
    };

    fetchLeadDetails();
  }, [selectedLead]); // Re-fetch when selectedLead changes

  const handleSendMessage = async () => {
    if (!selectedLead || !newMessage.trim() || conversations.length === 0) return;

    setLoading(true);
    setError(null);

    const currentConversationId = conversations[0].id; // Use the first conversation for now
    const userSession = await supabase.auth.getSession();
    const userId = userSession.data.session?.user?.id;

    if (!userId || !userSession.data.session?.user?.user_metadata?.org_id) {
      setError("User or Organization ID not found for sending message.");
      setLoading(false);
      return;
    }
    const orgId = userSession.data.session.user.user_metadata.org_id; // Assuming org_id is in user_metadata

    const { data, error: messageError } = await supabase
      .from("messages")
      .insert({
        org_id: orgId,
        conversation_id: currentConversationId,
        direction_in_out: "out",
        text: newMessage.trim(),
        created_at: new Date().toISOString(),
      })
      .select();

    if (messageError) {
      console.error("Error sending message:", messageError);
      setError("Failed to send message.");
    } else {
      setNewMessage("");
      // Re-fetch messages to update timeline, or optimistically add the new message
      if (data && data.length > 0) {
        setMessages(prev => [...prev, data[0]]);
      }
    }
    setLoading(false);
  };


  return (
    <Layout showNav={true}>
      <div className="max-w-screen-2xl mx-auto flex h-full">
        {/* Left Pane: Lead List */}
        <div className="w-1/4 bg-card border-r border-border p-4 flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Lead Inbox</h2>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {["all", "new", "active", "hot", "unreplied"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filterStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading && <p className="text-center text-muted-foreground">Loading leads...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            {!loading && leads.length === 0 && <p className="text-center text-muted-foreground">No leads found.</p>}
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedLead?.id === lead.id
                    ? "bg-primary/10 border border-primary"
                    : "bg-background hover:bg-muted"
                  }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {lead.full_name ? lead.full_name.charAt(0) : "L"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground truncate">
                    {lead.full_name || "Unknown Lead"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leadStatusConfig[lead.status] || lead.status} •{" "}
                    {lead.last_contact_at
                      ? new Date(lead.last_contact_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Pane: Conversation Timeline */}
        <div className="w-2/4 bg-background border-r border-border flex flex-col">
          {selectedLead ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">
                  {selectedLead.full_name || "Unknown Lead"}
                </h3>
                <span className="ml-auto text-sm text-muted-foreground">
                  {selectedLead.primary_channel}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && <p className="text-center text-muted-foreground">Loading timeline...</p>}
                {error && <p className="text-center text-red-500">{error}</p>}
                {!loading && messages.length === 0 && <p className="text-center text-muted-foreground">No conversation history.</p>}
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex ${"direction_in_out" in item && item.direction_in_out === "out"
                        ? "justify-end"
                        : "justify-start"
                      }`}
                  >
                    {"direction_in_out" in item ? ( // It's a message
                      <div
                        className={`max-w-[70%] p-3 rounded-xl shadow-sm ${item.direction_in_out === "out"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-foreground rounded-bl-none"
                          }`}
                      >
                        <p>{item.text}</p>
                        <p className="text-xs mt-1 opacity-75 text-right">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ) : ( // It's a lead event
                      <div className="text-center text-muted-foreground text-sm w-full py-2">
                        <span className="bg-muted px-3 py-1 rounded-full">
                          {item.event_type.replace(/_/g, ' ')} at {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border flex items-center gap-2">
                <button className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={loading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !newMessage.trim()}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
                {/* AI Generate Reply Button (Clippy's intelligence) */}
                <button
                  className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate AI Reply (Coming Soon)"
                  disabled // Disable for now as this needs Make.com integration
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a lead to view conversations.
            </div>
          )}
        </div>

        {/* Right Pane: Lead Profile & Quick Actions */}
        <div className="w-1/4 bg-card p-4 flex flex-col">
          {selectedLead ? (
            <>
              <h3 className="text-lg font-bold text-foreground mb-4">
                Lead Profile
              </h3>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <p className="font-semibold text-foreground">
                    {selectedLead.full_name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <p className="text-foreground">{selectedLead.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <p className="text-foreground">{selectedLead.phone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) =>
                      setSelectedLead({ ...selectedLead, status: e.target.value })
                    } // Update state (and eventually Supabase)
                    className="w-full mt-1 p-1 border border-border rounded-md bg-background"
                  >
                    {Object.keys(leadStatusConfig).map((key) => (
                      <option key={key} value={key}>{leadStatusConfig[key]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Stage</label>
                  <select
                    value={selectedLead.stage}
                    onChange={(e) =>
                      setSelectedLead({ ...selectedLead, stage: e.target.value })
                    } // Update state (and eventually Supabase)
                    className="w-full mt-1 p-1 border border-border rounded-md bg-background"
                  >
                    {Object.keys(leadStageConfig).map((key) => (
                      <option key={key} value={key}>{leadStageConfig[key]}</option>
                    ))}
                  </select>
                </div>
                {/* Add more lead details */}
              </div>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  disabled // Disable for now, needs implementation
                >
                  <Sparkles className="w-5 h-5" /> Generate Reply (AI)
                </button>
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  disabled // Disable for now, needs implementation
                >
                  <Mail className="w-5 h-5" /> Send Brochure Link
                </button>
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  disabled // Disable for now, needs implementation
                >
                  <Calendar className="w-5 h-5" /> Book Inspection Message
                </button>
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  disabled // Disable for now, needs implementation
                >
                  <ClipboardList className="w-5 h-5" /> Create Task
                </button>
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  disabled // Disable for now, needs implementation
                >
                  <Plus className="w-5 h-5" /> Add Note
                </button>
                {/* Linked Listing Card */}
                <div className="border border-border rounded-lg p-3 mt-4">
                  <p className="text-sm font-semibold text-foreground mb-1">Linked Listing:</p>
                  {/* Placeholder for linked listing */}
                  <p className="text-muted-foreground text-xs">No listing linked.</p>
                  <Link to="/listings/new" className="text-primary text-xs mt-2 block hover:underline">Link Listing</Link>
                </div>
                {/* Next Best Action Placeholder */}
                <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-3 mt-4">
                  <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2 mb-1"><Info className="w-4 h-4" /> Next Best Action:</p>
                  <p className="text-yellow-700 text-xs">Qualify Lead - Ask 3 questions</p>
                  <button className="text-yellow-700 text-xs mt-2 block hover:underline">Mark as Done</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a lead to see details and actions.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}