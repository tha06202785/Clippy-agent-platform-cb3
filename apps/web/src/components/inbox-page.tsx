"use client";

import { useState } from "react";
import { Search, Mail, Phone, MessageSquare, MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const leads = [
  { id: "1", name: "Sarah Johnson", email: "sarah@email.com", phone: "0401 234 567", status: "hot", source: "Website", lastContact: "2m ago", preview: "Looking for a 3-bed house in Paddington, budget around .5M" },
  { id: "2", name: "James Wilson", email: "james@email.com", phone: "0402 345 678", status: "warm", source: "Facebook", lastContact: "1h ago", preview: "Interested in investment properties in the Inner West" },
  { id: "3", name: "Emma Chen", email: "emma@email.com", phone: "0403 456 789", status: "new", source: "Referral", lastContact: "3h ago", preview: "First home buyer, pre-approved up to 50K" },
  { id: "4", name: "Michael Brown", email: "michael@email.com", phone: "0404 567 890", status: "cold", source: "Domain", lastContact: "1d ago", preview: "Enquired about 15 Park Street listing" },
  { id: "5", name: "Lisa Taylor", email: "lisa@email.com", phone: "0405 678 901", status: "hot", source: "Website", lastContact: "30m ago", preview: "Ready to make an offer on 22 Harbour Road" },
];

const statusColors: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  new: "bg-blue-500",
  cold: "bg-slate-400",
};

export function InboxPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex-1 overflow-y-auto">
          {filtered.map((lead) => (
            <button key={lead.id} onClick={() => setSelected(lead.id)}
              className={cn(
                "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors",
                selected === lead.id && "bg-muted"
              )}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", statusColors[lead.status])} />
                  <span className="text-sm font-semibold text-foreground">{lead.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{lead.lastContact}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lead.preview}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-muted-foreground">{lead.source}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{lead.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background">
        {selected ? (
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Lead conversation view coming soon</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a lead to view their conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
