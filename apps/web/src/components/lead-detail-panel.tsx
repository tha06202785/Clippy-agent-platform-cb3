"use client";

import { useState, useEffect } from "react";
import {
  X, Phone, MessageCircle, Mail, Sparkles, ChevronRight,
  Clock, User, MapPin, Star, Edit3, Check, Copy, ArrowLeft,
  Calendar, DollarSign, Home, AlertCircle
} from "lucide-react";

interface Lead {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  stage: string;
  ai_score: number | null;
  priority: string | null;
  buyer_type: string | null;
  notes: string | null;
  last_contact_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

const STAGES = [
  { id: "inquiry", label: "New Inquiry", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-amber-500" },
  { id: "qualified", label: "Qualified", color: "bg-purple-500" },
  { id: "proposal", label: "Proposal", color: "bg-orange-500" },
  { id: "negotiation", label: "Negotiating", color: "bg-pink-500" },
  { id: "closed_won", label: "Won 🎉", color: "bg-emerald-500" },
  { id: "closed_lost", label: "Lost", color: "bg-slate-400" },
];

const STATUS_COLORS: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  new: "bg-blue-500",
  cold: "bg-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  hot: "Hot lead",
  warm: "Warm lead",
  new: "New lead",
  cold: "Cold lead",
};

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onStageChange?: (leadId: string, stage: string) => void;
}

export function LeadDetailPanel({ lead, onClose, onStageChange }: LeadDetailPanelProps) {
  const [replyDraft, setReplyDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(lead.notes || "");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "activity" | "compose">("info");

  const currentStageIdx = STAGES.findIndex(s => s.id === lead.stage) ?? 0;
  const scoreColor = lead.ai_score
    ? lead.ai_score >= 70 ? "text-red-500" : lead.ai_score >= 40 ? "text-amber-500" : "text-slate-400"
    : "text-slate-400";

  const generateDraft = async () => {
    setIsGenerating(true);
    setShowReplyBox(true);
    setActiveTab("compose");

    try {
      const res = await fetch("/api/ai/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.full_name || "Prospect",
          leadMessage: lead.notes || "No prior messages — initial inquiry",
          context: `Stage: ${lead.stage} | Priority: ${lead.priority || "medium"} | Source: ${lead.source} | Buyer type: ${lead.buyer_type || "unspecified"}`,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setReplyDraft(data.reply);
      } else {
        setReplyDraft("Sorry, I couldn't generate a draft. Please try again.");
      }
    } catch {
      setReplyDraft("Network error — please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveNotes = async () => {
    try {
      await fetch(`/api/leads?id=${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editedNotes }),
      });
      setIsEditing(false);
    } catch {
      // silent fail
    }
  };

  const copyApprovedDraft = async () => {
    if (!replyDraft.trim()) return;
    await navigator.clipboard.writeText(replyDraft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const channelHref = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent("Follow-up from your real estate agent")}&body=${encodeURIComponent(replyDraft)}`
    : lead.phone
      ? `sms:${lead.phone}?body=${encodeURIComponent(replyDraft)}`
      : null;
  const channelLabel = lead.email ? "Open email" : "Open messages";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-semibold text-foreground">{lead.full_name || "Unknown Lead"}</h2>
            <p className="text-xs text-muted-foreground">
              {lead.email || "No email"} · {lead.phone || "No phone"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {lead.phone && (
            <>
              <a href={`tel:${lead.phone}`}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-emerald-600" title="Call">
                <Phone className="w-4 h-4" />
              </a>
              <a href={`sms:${lead.phone}`}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-blue-600" title="Text">
                <MessageCircle className="w-4 h-4" />
              </a>
            </>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-purple-600" title="Email">
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        {(["info", "activity", "compose"] as const).map((tab) => (
          <button key={tab}
            onClick={() => { setActiveTab(tab); setShowReplyBox(false); }}
            className={"px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize " +
              (activeTab === tab && !showReplyBox
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── INFO TAB ── */}
        {activeTab === "info" && (
          <div className="p-4 space-y-5">
            {/* Score + Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <div className={"text-3xl font-bold " + scoreColor}>
                  {lead.ai_score != null ? lead.ai_score : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">AI Score</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Stage</p>
                <div className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white " +
                  (STAGES[currentStageIdx]?.color || "bg-slate-400")}>
                  {STAGES[currentStageIdx]?.label || "New"}
                </div>
              </div>
            </div>

            {/* Quick Stage Progress */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Move to stage</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.filter(s => s.id !== "closed_lost").map((stage) => {
                  const isCurrent = stage.id === lead.stage;
                  return (
                    <button key={stage.id}
                      onClick={() => onStageChange?.(lead.id, stage.id)}
                      className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all border " +
                        (isCurrent
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground")
                      }>
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lead Info */}
            <div className="space-y-2">
              {[
                { icon: User, label: "Name", value: lead.full_name || "—" },
                { icon: Mail, label: "Email", value: lead.email || "—" },
                { icon: Phone, label: "Phone", value: lead.phone || "—" },
                { icon: MapPin, label: "Source", value: lead.source || "manual" },
                { icon: Star, label: "Priority", value: lead.priority || "medium" },
                { icon: Home, label: "Buyer type", value: lead.buyer_type || "Not specified" },
                { icon: Calendar, label: "Created", value: new Date(lead.created_at).toLocaleDateString() },
                {
                  icon: Clock, label: "Last activity",
                  value: lead.last_activity_at
                    ? new Date(lead.last_activity_at).toLocaleDateString()
                    : new Date(lead.created_at).toLocaleDateString()
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-28">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">Notes</p>
                <button onClick={() => isEditing ? void saveNotes() : setIsEditing(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  {isEditing ? (
                    <><Check className="w-3 h-3" /> Save</>
                  ) : (
                    <><Edit3 className="w-3 h-3" /> Edit</>
                  )}
                </button>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea value={editedNotes} onChange={e => setEditedNotes(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Add notes about this lead..."
                  />
                  <button onClick={saveNotes}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                    Save notes
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lead.notes || "No notes yet. Click Edit to add notes about this lead."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === "activity" && (
          <div className="p-4">
            {lead.notes ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Lead notes</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(lead.updated_at).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{lead.notes}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add notes to track interactions with this lead.</p>
              </div>
            )}
          </div>
        )}

        {/* ── COMPOSE TAB ── */}
        {activeTab === "compose" && (
          <div className="p-4 space-y-4">
            {!showReplyBox ? (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">AI Draft Reply</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Clippy will draft a professional, AU-compliant reply to send to this lead.
                </p>
                <button onClick={generateDraft} disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isGenerating ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Draft a reply</>
                  )}
                </button>
              </div>
            ) : (
              <>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">Clippy is drafting your reply…</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Your reply to {lead.full_name || "lead"}</p>
                      <button onClick={generateDraft}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                    <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)}
                      rows={8}
                      className="w-full p-4 rounded-xl border border-input bg-background text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="AI draft will appear here…"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => void copyApprovedDraft()} disabled={!replyDraft.trim()}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {copied ? (
                          <><Check className="w-4 h-4" /> Draft copied</>
                        ) : (
                          <><Copy className="w-4 h-4" /> Approve and copy</>
                        )}
                      </button>
                      {channelHref && (
                        <a
                          href={channelHref}
                          className="px-4 py-3 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          {channelLabel}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Clippy creates the draft only. Review it, then confirm delivery in your email or messaging app.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {!showReplyBox && (
        <div className="p-4 border-t border-border">
          <button onClick={generateDraft} disabled={isGenerating}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Generating…" : "Draft AI Reply"}
          </button>
        </div>
      )}
    </div>
  );
}
