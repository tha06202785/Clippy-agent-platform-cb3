"use client";
import { useState } from "react";
import { Building2, Plus, Search, TrendingUp, TrendingDown, MoreHorizontal, Users, DollarSign, Home } from "lucide-react";

const offices = [
  { id: "1", name: "Sydney CBD", address: "123 George St, Sydney NSW 2000", agents: 45, pipeline: "2M", revenue: "80K", growth: "+12%", status: "healthy", manager: "Sarah Chen" },
  { id: "2", name: "Eastern Suburbs", address: "456 Oxford St, Bondi Junction NSW 2022", agents: 38, pipeline: "8M", revenue: "50K", growth: "+8%", status: "healthy", manager: "James Wilson" },
  { id: "3", name: "Inner West", address: "789 King St, Newtown NSW 2042", agents: 52, pipeline: "1M", revenue: ".1M", growth: "+15%", status: "healthy", manager: "Emma Thompson" },
  { id: "4", name: "Northern Beaches", address: "321 Pittwater Rd, Manly NSW 2095", agents: 41, pipeline: "9M", revenue: "20K", growth: "-3%", status: "warning", manager: "Michael Brown" },
  { id: "5", name: "Western Sydney", address: "654 Church St, Parramatta NSW 2150", agents: 35, pipeline: "8M", revenue: "50K", growth: "+5%", status: "healthy", manager: "Lisa Wang" },
  { id: "6", name: "South Sydney", address: "987 Botany Rd, Mascot NSW 2020", agents: 36, pipeline: "M", revenue: "80K", growth: "-8%", status: "critical", manager: "David Park" },
];

export default function OfficesPage() {
  const [search, setSearch] = useState("");
  const filtered = offices.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offices</h1>
          <p className="text-muted-foreground text-sm mt-1">{offices.length} offices · 247 agents · 87M total pipeline</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add office
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search offices..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid gap-4">
        {filtered.map((office) => (
          <div key={office.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{office.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{office.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">Manager: {office.manager}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{office.agents}</p>
                  <p className="text-[10px] text-muted-foreground">Agents</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{office.pipeline}</p>
                  <p className="text-[10px] text-muted-foreground">Pipeline</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{office.revenue}</p>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                </div>
                <div className="text-right">
                  <span className={"inline-flex items-center gap-1 text-xs font-semibold " + (office.growth.startsWith("+") ? "text-emerald-500" : "text-red-500")}>
                    {office.growth.startsWith("+") ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {office.growth}
                  </span>
                </div>
                <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                  (office.status === "healthy" ? "bg-emerald-100 text-emerald-700" :
                   office.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                  {office.status}
                </span>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
