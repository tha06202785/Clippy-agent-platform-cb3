"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { LeadDetailPanel } from "./lead-detail-panel";

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

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toLead(value: unknown): Lead | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  const now = new Date().toISOString();

  return {
    id: row.id,
    full_name: optionalString(row.full_name),
    email: optionalString(row.email),
    phone: optionalString(row.phone),
    source: optionalString(row.source) || "manual",
    status: optionalString(row.status) || "new",
    stage: optionalString(row.stage) || "inquiry",
    ai_score: typeof row.ai_score === "number" ? row.ai_score : null,
    priority: optionalString(row.priority),
    buyer_type: optionalString(row.buyer_type),
    notes: optionalString(row.notes),
    last_contact_at: optionalString(row.last_contact_at),
    last_activity_at: optionalString(row.last_activity_at),
    created_at: optionalString(row.created_at) || now,
    updated_at: optionalString(row.updated_at) || now,
  };
}

export function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setLeads(data.map(toLead).filter((lead): lead is Lead => !!lead));
        } else {
          setLeads([]);
        }
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(
    (l) =>
      (l.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  const selectedLead = selected
    ? (leads.find((l) => l.id === selected) ?? null)
    : null;

  const handleStageChange = (leadId: string, stage: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage } : l)),
    );
  };

  if (loading) {
    return (
      <div
        className="-m-4 flex h-[calc(100dvh-8.5rem)] sm:-m-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex w-full flex-col border-r border-border bg-card p-4 md:w-96">
          <div className="h-10 bg-muted rounded-lg animate-pulse mb-4" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-muted rounded-lg animate-pulse mb-2"
            />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading inbox...
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-8.5rem)] sm:-m-6">
      {/* Lead list */}
      <aside
        aria-label="Lead list"
        className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border bg-card md:w-96`}
      >
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              aria-label="Search leads"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search
                ? "No leads match your search."
                : "No leads yet. Connect your first integration to import leads."}
            </div>
          ) : (
            filtered.map((lead) => (
              <button
                type="button"
                key={lead.id}
                onClick={() => setSelected(lead.id)}
                aria-current={selected === lead.id ? "true" : undefined}
                className={
                  "w-full border-b border-border p-4 text-left hover:bg-muted/50 transition-colors " +
                  (selected === lead.id ? "bg-muted" : "")
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {(lead.full_name || "?")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {lead.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.email || "No contact info"}
                      </p>
                    </div>
                  </div>
                  <span className="font-dashboard-mono text-[10px] text-muted-foreground tabular-nums">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                  Source: {lead.source} · Stage: {lead.stage}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Detail panel */}
      <section
        aria-label="Lead details"
        className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}
      >
        {selectedLead ? (
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelected(null)}
            onStageChange={handleStageChange}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a lead to view details
          </div>
        )}
      </section>
    </div>
  );
}
