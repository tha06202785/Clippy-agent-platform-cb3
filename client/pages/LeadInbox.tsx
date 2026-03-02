import { useState, useEffect, useRef } from "react";
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
import { supabase } from "@/lib/supabase";

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
  email: { icon: Mail, color: "text-cyan-400" },
  phone: { icon: Phone, color: "text-emerald-400" },
  instagram: { icon: MessageSquare, color: "text-purple-400" },
  facebook: { icon: MessageSquare, color: "text-cyan-400" },
  whatsapp: { icon: MessageSquare, color: "text-emerald-400" },
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
  const [userOrgId, setUserOrgId] = useState<string | null>(null); // State to store user's org_id
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling

  // --- Filter and Sort States ---
  const [filterStatus, setFilterStatus] = useState("all"); // 'new', 'active', 'hot', 'unreplied', 'all'
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-select first lead when leads are loaded
  useEffect(() => {
    if (leads.length > 0 && !selectedLead) {
      setSelectedLead(leads[0]);
    }
  }, [leads, selectedLead]);

  // Effect to fetch user's org_id
  useEffect(() => {
    const fetchUserOrgId = async () => {
      const userSession = await supabase.auth.getSession();
      const userId = userSession.data.session?.user?.id;

      if (!userId) {
        navigate("/signup");
        return;
      }

      // Fetch org_id from user_org_roles table
      const { data, error: orgError } = await supabase
        .from('user_org_roles')
        .select('org_id')
        .eq('user_id', userId)
        .single(); // Assuming one role per user per org for simplicity

      if (orgError) {
        console.error("Error fetching user's org_id:", orgError);
        setError("Failed to retrieve user's organization ID.");
        setUserOrgId(null);
      } else if (data) {
        setUserOrgId(data.org_id);
      } else {
        setError("User is not linked to any organization.");
        setUserOrgId(null);
      }
    };
    fetchUserOrgId();
  }, [navigate]); // Run once on component mount or if navigate changes

  // Effect to fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!userOrgId) return; // Wait until org_id is available

      setLoading(true);
      setError(null);

      const userSession = await supabase.auth.getSession();
      const userId = userSession.data.session?.user?.id;

      if (!userId) {
        navigate("/signup"); // Redirect to login if not authenticated
        return;
      }

      try {
        let query = supabase
          .from("leads")
          .select("*")
          .eq("assigned_to_user_id", userId)
          .eq("org_id", userOrgId) // Filter by user's org_id
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
      } catch (err: any) {
        console.error("Error fetching leads:", err);
        setError("Failed to load leads.");
      }
      setLoading(false);
    };

    fetchLeads();
  }, [filterStatus, searchTerm, navigate, userOrgId]); // Re-fetch when filters or org_id change

  // Effect to fetch lead details (conversations, messages, events)
  useEffect(() => {
    const fetchLeadDetails = async () => {
      if (!selectedLead || !userOrgId) { // Wait for selectedLead and userOrgId
        setMessages([]);
        setConversations([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch conversations for the selected lead
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("lead_id", selectedLead.id)
          .eq("org_id", userOrgId) // Filter by org_id
          .order("last_message_at", { ascending: false });

        if (convError) {
          console.error("Error fetching conversations:", convError);
          setError("Failed to load conversations.");
          setLoading(false);
          return;
        }
        setConversations(convData || []);

        let allTimelineItems: (Message | LeadEvent)[] = [];
        // Fetch messages if a conversation exists
        if (convData && convData.length > 0) {
          const { data: msgData, error: msgError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convData[0].id)
            .eq("org_id", userOrgId) // Filter by org_id
            .order("created_at", { ascending: true });
          if (msgError) {
            console.error("Error fetching messages:", msgError);
            setError("Failed to load messages.");
          } else {
            allTimelineItems = [...(msgData || [])];
          }
        }

        // Fetch lead events
        const { data: eventData, error: eventError } = await supabase
          .from("lead_events")
          .select("*")
          .eq("lead_id", selectedLead.id)
          .eq("org_id", userOrgId) // Filter by org_id
          .order("created_at", { ascending: true });

        if (eventError) {
          console.error("Error fetching events:", eventError);
          setError("Failed to load events.");
        } else {
          allTimelineItems = [...allTimelineItems, ...(eventData || [])];
        }

        allTimelineItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setMessages(allTimelineItems);
      } catch (err: any) {
        console.error("Error fetching lead details:", err);
        setError("Failed to load lead details.");
      }

      setLoading(false);
    };

    fetchLeadDetails();
  }, [selectedLead, userOrgId]); // Re-fetch when selectedLead or org_id changes

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!selectedLead || !newMessage.trim() || !userOrgId) return; // Ensure org_id is present

    setLoading(true);
    setError(null);

    const userSession = await supabase.auth.getSession();
    const userId = userSession.data.session?.user?.id;

    if (!userId) {
      setError("User ID not found. Please log in.");
      setLoading(false);
      return;
    }

    let currentConversationId = conversations.length > 0 ? conversations[0].id : null;

    // If no conversation exists, create one
    if (!currentConversationId) {
      const { data: newConv, error: createConvError } = await supabase
        .from('conversations')
        .insert({
          org_id: userOrgId,
          lead_id: selectedLead.id,
          channel: selectedLead.primary_channel || 'manual', // Use primary channel or default
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createConvError) {
        console.error("Error creating new conversation:", createConvError);
        setError("Failed to start new conversation.");
        setLoading(false);
        return;
      }
      currentConversationId = newConv.id;
      setConversations([newConv]); // Add new conversation to state
    }

    // Insert the new message
    const { data, error: messageError } = await supabase
      .from("messages")
      .insert({
        org_id: userOrgId,
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
      if (data && data.length > 0) {
        setMessages(prev => [...prev, data[0]]);
      }

      // Update lead's last_contact_at
      await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', selectedLead.id);
    }
    setLoading(false);
  };


  return (
    <Layout showNav={true}>
      <div className="max-w-screen-2xl mx-auto flex h-full">
        {/* Left Pane: Lead List - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex lg:w-1/4 bg-card border-r border-border p-3 md:p-4 flex-col">
          <div className="mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Lead Inbox</h2>
          </div>
          <div className="relative mb-3 md:mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4 overflow-x-auto pb-2">
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

        {/* Middle Pane: Conversation Timeline - Full width on mobile, half on desktop */}
        <div className="w-full lg:w-2/4 bg-background border-r border-border flex flex-col">
          {selectedLead ? (
            <>
              <div className="p-3 md:p-4 border-b border-border flex items-center gap-2 md:gap-3">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                <h3 className="text-sm md:text-lg font-bold text-foreground truncate">
                  {selectedLead.full_name || "Unknown Lead"}
                </h3>
                <span className="ml-auto text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                  {selectedLead.primary_channel}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
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
                <div ref={messagesEndRef} /> {/* Auto-scroll target */}
              </div>
              <div className="p-3 md:p-4 border-t border-border flex items-center gap-2">
                <button className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex-shrink-0">
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={loading || !userOrgId || !selectedLead} // Disable if loading or no org/lead
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !newMessage.trim() || !userOrgId || !selectedLead} // Disable if loading or no message/org/lead
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Send"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                {/* AI Generate Reply Button (Clippy's intelligence) */}
                <button
                  className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Generate AI Reply (Coming Soon)"
                  disabled // Disable for now as this needs Make.com integration
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a lead to view conversations.
            </div>
          )}
        </div>

        {/* Right Pane: Lead Profile & Quick Actions - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex lg:w-1/4 bg-card p-3 md:p-4 flex-col">
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
                    onChange={async (e) => { // Added async
                      if (selectedLead && userOrgId) {
                        const newStatus = e.target.value;
                        setSelectedLead({ ...selectedLead, status: newStatus });
                        // Update Supabase
                        const { error: updateError } = await supabase
                          .from('leads')
                          .update({ status: newStatus, updated_at: new Date().toISOString() })
                          .eq('id', selectedLead.id)
                          .eq('org_id', userOrgId);

                        if (updateError) {
                          console.error("Error updating lead status:", updateError);
                          setError("Failed to update lead status.");
                        } else {
                          // Also create a lead event
                          await supabase.from('lead_events').insert({
                            org_id: userOrgId,
                            lead_id: selectedLead.id,
                            event_type: 'status_changed',
                            payload_json: { old_status: selectedLead.status, new_status: newStatus },
                            created_at: new Date().toISOString()
                          });
                        }
                      }
                    }}
                    className="w-full mt-1 p-1 border border-border rounded-md bg-background"
                    disabled={loading || !userOrgId}
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
                    onChange={async (e) => { // Added async
                      if (selectedLead && userOrgId) {
                        const newStage = e.target.value;
                        setSelectedLead({ ...selectedLead, stage: newStage });
                        // Update Supabase
                        const { error: updateError } = await supabase
                          .from('leads')
                          .update({ stage: newStage, updated_at: new Date().toISOString() })
                          .eq('id', selectedLead.id)
                          .eq('org_id', userOrgId);

                        if (updateError) {
                          console.error("Error updating lead stage:", updateError);
                          setError("Failed to update lead stage.");
                        } else {
                          // Also create a lead event
                          await supabase.from('lead_events').insert({
                            org_id: userOrgId,
                            lead_id: selectedLead.id,
                            event_type: 'status_changed', // Using status_changed for stage as well
                            payload_json: { old_stage: selectedLead.stage, new_stage: newStage },
                            created_at: new Date().toISOString()
                          });
                        }
                      }
                    }}
                    className="w-full mt-1 p-1 border border-border rounded-md bg-background"
                    disabled={loading || !userOrgId}
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
                <div className="border-2 border-cyan-400/40 bg-cyan-900/30 rounded-lg p-3 mt-4 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-cyan-200 flex items-center gap-2 mb-1"><Info className="w-4 h-4" /> Next Best Action:</p>
                  <p className="text-cyan-300/80 text-xs">Qualify Lead - Ask 3 questions</p>
                  <button className="text-cyan-300 text-xs mt-2 block hover:text-cyan-200 transition-colors">Mark as Done</button>
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
