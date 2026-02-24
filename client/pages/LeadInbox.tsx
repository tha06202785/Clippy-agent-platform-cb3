import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MessageCircle,
  Send,
  Zap,
  Plus,
  Filter,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Check,
  AlertCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  stage: string;
  source: string;
  primary_channel: string;
  last_contact_at: string;
  notes?: string;
  buyer_type?: string;
  assigned_to_user_id?: string;
  listing_id?: string;
}

interface Message {
  id: string;
  lead_id: string;
  text: string;
  direction: "in" | "out";
  created_at: string;
  channel: string;
}

interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  created_at: string;
  details?: string;
}

// Sample data for demo
const SAMPLE_LEADS: Lead[] = [
  {
    id: "1",
    full_name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    status: "hot",
    stage: "qualified",
    source: "web",
    primary_channel: "email",
    last_contact_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    buyer_type: "first_time_buyer",
    notes: "Very interested in 123 Main St. Wants to schedule inspection.",
  },
  {
    id: "2",
    full_name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1 (555) 234-5678",
    status: "active",
    stage: "interested",
    source: "facebook",
    primary_channel: "sms",
    last_contact_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    buyer_type: "investor",
  },
  {
    id: "3",
    full_name: "Mike Wilson",
    email: "mike@example.com",
    phone: "+1 (555) 345-6789",
    status: "new",
    stage: "lead",
    source: "phone",
    primary_channel: "phone",
    last_contact_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SAMPLE_MESSAGES: Message[] = [
  {
    id: "1",
    lead_id: "1",
    text: "Hi! I'm very interested in the property at 123 Main St. Can you tell me more about it?",
    direction: "in",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    channel: "email",
  },
  {
    id: "2",
    lead_id: "1",
    text: "Of course! 123 Main St is a beautiful 3-bedroom home in a great neighborhood. Would you like to schedule a viewing?",
    direction: "out",
    created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    channel: "email",
  },
  {
    id: "3",
    lead_id: "1",
    text: "Yes, I'd love to! What times work for you?",
    direction: "in",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    channel: "email",
  },
];

export default function LeadInbox() {
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(SAMPLE_LEADS[0]);
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [messageText, setMessageText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter leads based on search and status
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Get messages for selected lead
  const leadMessages = selectedLead
    ? messages.filter((msg) => msg.lead_id === selectedLead.id)
    : [];

  const handleSendMessage = () => {
    if (messageText.trim() && selectedLead) {
      const newMessage: Message = {
        id: Date.now().toString(),
        lead_id: selectedLead.id,
        text: messageText,
        direction: "out",
        created_at: new Date().toISOString(),
        channel: selectedLead.primary_channel,
      };
      setMessages([...messages, newMessage]);
      setMessageText("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot":
        return "bg-red-50 text-red-700 border-red-200";
      case "active":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "new":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "qualified":
        return "bg-purple-100 text-purple-700";
      case "interested":
        return "bg-blue-100 text-blue-700";
      case "lead":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Layout showNav={true}>
      <div className="h-[calc(100vh-200px)] bg-background rounded-2xl border border-border overflow-hidden flex">
        {/* Left Pane - Lead List (25%) */}
        <div className="w-1/4 border-r border-border flex flex-col bg-card">
          {/* Search Bar */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border overflow-x-auto">
            {["all", "new", "active", "hot"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  filterStatus === tab
                    ? "bg-primary text-primary-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Leads List */}
          <div className="flex-1 overflow-y-auto">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full text-left p-4 border-b border-border transition-colors ${
                    selectedLead?.id === lead.id
                      ? "bg-primary/10 border-l-4 border-l-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-foreground truncate">
                      {lead.full_name}
                    </p>
                    {lead.status === "new" && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {lead.email}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lead.last_contact_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No leads found
              </div>
            )}
          </div>
        </div>

        {/* Middle Pane - Conversation (50%) */}
        {selectedLead ? (
          <div className="w-1/2 border-r border-border flex flex-col bg-background">
            {/* Lead Header */}
            <div className="p-4 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground mb-1">
                {selectedLead.full_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedLead.primary_channel} • Last contact:{" "}
                {new Date(selectedLead.last_contact_at).toLocaleDateString()}
              </p>
            </div>

            {/* Messages Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {leadMessages.length > 0 ? (
                leadMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.direction === "out"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-3 rounded-lg ${
                        message.direction === "out"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.direction === "out"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet. Start a conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button className="w-full py-2 px-4 bg-clippy-100 text-primary font-semibold rounded-lg hover:bg-clippy-200 transition-colors flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Generate AI Reply
              </button>
            </div>
          </div>
        ) : (
          <div className="w-1/2 border-r border-border flex items-center justify-center bg-background">
            <p className="text-muted-foreground">Select a lead to view conversation</p>
          </div>
        )}

        {/* Right Pane - Lead Profile & Actions (25%) */}
        {selectedLead ? (
          <div className="w-1/4 flex flex-col bg-card overflow-y-auto">
            {/* Lead Details */}
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-foreground mb-4">Lead Details</h3>

              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Full Name
                  </label>
                  <p className="text-sm text-foreground font-medium">
                    {selectedLead.full_name}
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </label>
                  <p className="text-sm text-foreground font-medium break-all">
                    {selectedLead.email}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </label>
                  <p className="text-sm text-foreground font-medium">
                    {selectedLead.phone}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Status
                  </label>
                  <select className="w-full text-sm px-2 py-1 rounded border border-border bg-background text-foreground">
                    <option value="new">New</option>
                    <option value="active" selected={selectedLead.status === "active"}>
                      Active
                    </option>
                    <option value="hot" selected={selectedLead.status === "hot"}>
                      Hot
                    </option>
                    <option value="cold">Cold</option>
                  </select>
                </div>

                {/* Stage */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Stage
                  </label>
                  <div className={`text-sm px-3 py-1 rounded-full font-medium w-fit ${getStageColor(selectedLead.stage)}`}>
                    {selectedLead.stage}
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Source
                  </label>
                  <p className="text-sm text-foreground font-medium capitalize">
                    {selectedLead.source}
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Listing */}
            {selectedLead.listing_id && (
              <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground mb-2">Linked Listing</h3>
                <Link
                  to={`/listings/${selectedLead.listing_id}`}
                  className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors block"
                >
                  <p className="text-sm font-semibold text-foreground">
                    123 Main Street
                  </p>
                  <p className="text-xs text-muted-foreground">View listing</p>
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full py-2 px-3 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Send Brochure
                </button>
                <button className="w-full py-2 px-3 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Book Inspection
                </button>
                <button className="w-full py-2 px-3 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Task
                </button>
              </div>
            </div>

            {/* Add Note */}
            <div className="p-4">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Add Note
              </label>
              <textarea
                placeholder="Add notes about this lead..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={4}
              />
              <button className="w-full mt-2 py-2 px-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                Save Note
              </button>
            </div>
          </div>
        ) : (
          <div className="w-1/4 flex items-center justify-center bg-card text-muted-foreground">
            <p>Select a lead to view details</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
