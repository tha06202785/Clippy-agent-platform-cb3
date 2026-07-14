"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { Lead } from "@clippy/shared";

export function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data);
        else setLeads([]);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) =>
    (l.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8">
        <div className="w-96 border-r border-border bg-card flex flex-col p-4">
          <div className="h-10 bg-muted rounded-lg animate-pulse mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse mb-2" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading inbox...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8">
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search ? "No leads match your search." : "No leads yet. Connect your first integration to import leads."}
            </div>
          ) : (
            filtered.map((lead) => (
              <div key={lead.id}
                onClick={() => setSelected(lead.id)}
                className={"p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors " + (selected === lead.id ? "bg-muted" : "")}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {(lead.fullName || "?")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.fullName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{lead.email || "No contact info"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">Source: {lead.source} | Stage: {lead.stage}</p>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {selected ? "Select a lead to view details" : "Select a lead from the list"}
      </div>
    </div>
  );
}
