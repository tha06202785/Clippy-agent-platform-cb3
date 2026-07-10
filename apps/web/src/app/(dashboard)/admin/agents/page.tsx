"use client";
import { useState } from "react";
import { Users, Search, MoreHorizontal, TrendingUp, TrendingDown, Star, AlertTriangle, Phone, Mail, MessageCircle } from "lucide-react";

const agents = [
  { id: "1", name: "Sarah Chen", email: "sarah@premier.com", phone: "0401 234 567", office: "Sydney CBD", deals: 12, volume: ".2M", commission: "46K", status: "active", trend: "up", rating: 4.9 },
  { id: "2", name: "James Wilson", email: "james@premier.com", phone: "0402 345 678", office: "Inner West", deals: 9, volume: ".8M", commission: "04K", status: "active", trend: "up", rating: 4.7 },
  { id: "3", name: "Emma Thompson", email: "emma@premier.com", phone: "0403 456 789", office: "Eastern Suburbs", deals: 7, volume: ".1M", commission: "53K", status: "active", trend: "up", rating: 4.5 },
  { id: "4", name: "Michael Brown", email: "michael@premier.com", phone: "0404 567 890", office: "Northern Beaches", deals: 4, volume: ".8M", commission: "4K", status: "active", trend: "down", rating: 3.8 },
  { id: "5", name: "Lisa Wang", email: "lisa@premier.com", phone: "0405 678 901", office: "Western Sydney", deals: 6, volume: ".2M", commission: "6K", status: "active", trend: "up", rating: 4.2 },
  { id: "6", name: "David Park", email: "david@premier.com", phone: "0406 789 012", office: "South Sydney", deals: 2, volume: ".1M", commission: "3K", status: "at_risk", trend: "down", rating: 3.1 },
  { id: "7", name: "John Smith", email: "john@premier.com", phone: "0407 890 123", office: "South Sydney", deals: 0, volume: "/bin/bash", commission: "/bin/bash", status: "inactive", trend: "down", rating: 2.5 },
];

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = agents.filter(a => {
    if (filter === "at_risk") return a.status === "at_risk" || a.status === "inactive";
    if (filter === "active") return a.status === "active";
    return true;
  }).filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">{agents.length} agents across 6 offices</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">Invite agent</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex gap-1">
          {["all", "active", "at_risk"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={"px-3 py-1.5 rounded-full text-xs font-medium transition-colors " + (filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {f === "all" ? "All" : f === "at_risk" ? "At risk" : "Active"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Office</th>
              <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deals</th>
              <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
              <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Commission</th>
              <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((agent) => (
              <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={"w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs " + (agent.trend === "up" ? "bg-emerald-500" : "bg-red-400")}>
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{agent.office}</td>
                <td className="p-4 text-right text-sm font-semibold text-foreground">{agent.deals}</td>
                <td className="p-4 text-right text-sm font-semibold text-foreground">{agent.volume}</td>
                <td className="p-4 text-right text-sm font-semibold text-foreground">{agent.commission}</td>
                <td className="p-4 text-center">
                  <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                    (agent.status === "active" ? "bg-emerald-100 text-emerald-700" :
                     agent.status === "at_risk" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500")}>
                    {agent.status === "at_risk" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {agent.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Call"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Message"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Email"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
