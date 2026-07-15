"use client";

import { useEffect, useState } from "react";
import { Search, Phone, MessageCircle, Mail } from "lucide-react";
import { LeadDetailPanel } from "@/components/lead-detail-panel";

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

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLeads(data);
        } else {
          setLeads([]);
        }
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) =>
    (l.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || "").includes(search)
  );

  const handleStageChange = async (leadId: string, stage: string) => {
    try {
      const res = await fetch(`/api/leads?id=${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, status: stage === "closed_won" ? "closed_won" : stage === "closed_lost" ? "closed_lost" : stage === "qualified" ? "qualified" : "contacted" }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage } : l));
        setSelected(prev => prev?.id === leadId ? { ...prev, stage } : prev);
      }
    } catch {
      // silent fail
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8">
        <div className="w-96 border-r border-border bg-card flex flex-col p-4">
          <div className="h-10 bg-muted rounded-lg animate-pulse mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse mb-2" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading inbox…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8">
      {/* Lead list */}
      <div className="w-96 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search ? "No leads match your search." : "No leads yet. Add your first lead to get started."}
            </div>
          ) : (
            filtered.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelected(lead)}
                className={
                  "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors " +
                  (selected?.id === lead.id ? "bg-muted" : "")
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                      {(lead.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {lead.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.email || "No contact"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    {lead.ai_score != null && (
                      <span className={
                        "text-[10px] font-bold " +
                        (lead.ai_score >= 70 ? "text-red-500" : lead.ai_score >= 40 ? "text-amber-500" : "text-muted-foreground")
                      }>
                        {lead.ai_score}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted-foreground">
                    {lead.source} · <span className="capitalize">{lead.stage.replace("_", " ")}</span>
                  </p>
                  <div className="flex items-center gap-0.5">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                    {lead.phone && (
                      <a
                        href={`sms:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Text"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Email"
                      >
                        <Mail className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 bg-background overflow-hidden">
        {selected ? (
          <LeadDetailPanel
            lead={selected}
            onClose={() => setSelected(null)}
            onStageChange={handleStageChange}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Select a lead</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Choose a lead from the list to view their details, stage, and draft an AI reply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
