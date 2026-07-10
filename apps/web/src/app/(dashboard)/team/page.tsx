"use client";
import { useState } from "react";
import { Users, Search, Plus, UserCheck, UserX, Clock, Phone, MessageCircle, Mail, MoreHorizontal } from "lucide-react";

const teamMembers = [
  { id: "1", name: "Sarah Chen", role: "Agent", status: "online", leads: 12, lastActive: "Now", deals: 3, volume: ".1M" },
  { id: "2", name: "James Wilson", role: "Agent", status: "online", leads: 8, lastActive: "5m ago", deals: 2, volume: ".8M" },
  { id: "3", name: "Emma Thompson", role: "Senior Agent", status: "away", leads: 15, lastActive: "1h ago", deals: 4, volume: ".2M" },
  { id: "4", name: "Michael Brown", role: "Agent", status: "offline", leads: 5, lastActive: "3h ago", deals: 1, volume: "50K" },
  { id: "5", name: "Lisa Wang", role: "Office Manager", status: "online", leads: 0, lastActive: "2m ago", deals: 0, volume: "/bin/bash" },
];

const sharedLeads = [
  { id: "1", name: "David Chen", value: ".5M", source: "Website", status: "unassigned", timeInPool: "2h", priority: "high" },
  { id: "2", name: "Anna Lee", value: ".8M", source: "Facebook", status: "unassigned", timeInPool: "45m", priority: "high" },
  { id: "3", name: "Tom Baker", value: "50K", source: "Referral", status: "claimed", timeInPool: "1h", priority: "medium", claimedBy: "Sarah Chen" },
];

export default function TeamPage() {
  const [tab, setTab] = useState<"members" | "leads">("members");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your team and shared leads</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invite member
        </button>
      </div>

      <div className="flex gap-1">
        {["members", "leads"].map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            {t === "members" ? "Team members" : "Shared leads"}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Member</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Leads</th>
                <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Deals</th>
                <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Volume</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {m.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">Active {m.lastActive}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{m.role}</td>
                  <td className="p-4 text-center">
                    <span className={"inline-flex items-center gap-1.5 text-xs font-medium " + (m.status === "online" ? "text-emerald-600" : m.status === "away" ? "text-amber-600" : "text-slate-400")}>
                      <span className={"w-1.5 h-1.5 rounded-full " + (m.status === "online" ? "bg-emerald-500" : m.status === "away" ? "bg-amber-500" : "bg-slate-300")} />
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm font-semibold text-foreground">{m.leads}</td>
                  <td className="p-4 text-right text-sm font-semibold text-foreground">{m.deals}</td>
                  <td className="p-4 text-right text-sm font-semibold text-foreground">{m.volume}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-muted"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-muted"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-muted"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "leads" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            Leads in the shared pool for over 1 hour will be auto-assigned to the next available agent.
          </div>
          {sharedLeads.map((lead) => (
            <div key={lead.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={"w-2 h-2 rounded-full mt-2 " + (lead.priority === "high" ? "bg-red-500" : "bg-amber-500")} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{lead.name}</h3>
                      <span className="text-xs text-muted-foreground">{lead.value}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">{lead.source}</span>
                      <span className="text-[10px] text-muted-foreground">In pool: {lead.timeInPool}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lead.status === "unassigned" ? (
                    <>
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90">Claim</button>
                      <button className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted">Assign</button>
                    </>
                  ) : (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> {lead.claimedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
