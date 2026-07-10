"use client";
import { useState } from "react";
import { Building2, Users, Shield, BarChart3, Globe, Settings, ChevronRight, TrendingUp, AlertTriangle, CheckCircle, Download, Eye, UserCheck, DollarSign, Clock } from "lucide-react";

// This is the ENTERPRISE DASHBOARD — what a brokerage owner/CEO sees
// Not "what leads need attention" but "which offices are performing, which agents are at risk, where is money being left on the table"

export function EnterpriseOverview() {
  const [selectedOffice, setSelectedOffice] = useState("all");

  const metrics = {
    totalAgents: 247,
    activeListings: 892,
    totalPipeline: "87M",
    monthlyRevenue: ".2M",
    avgDealSize: ".8M",
    conversionRate: "68%",
    agentRetention: "94%",
    avgResponseTime: "<5 min",
  };

  const offices = [
    { id: "sydney-cbd", name: "Sydney CBD", agents: 45, pipeline: "2M", revenue: "80K", growth: "+12%", status: "healthy" },
    { id: "eastern-suburbs", name: "Eastern Suburbs", agents: 38, pipeline: "8M", revenue: "50K", growth: "+8%", status: "healthy" },
    { id: "inner-west", name: "Inner West", agents: 52, pipeline: "1M", revenue: ".1M", growth: "+15%", status: "healthy" },
    { id: "northern-beaches", name: "Northern Beaches", agents: 41, pipeline: "9M", revenue: "20K", growth: "-3%", status: "warning" },
    { id: "western-sydney", name: "Western Sydney", agents: 35, pipeline: "8M", revenue: "50K", growth: "+5%", status: "healthy" },
    { id: "south-sydney", name: "South Sydney", agents: 36, pipeline: "M", revenue: "80K", growth: "-8%", status: "critical" },
  ];

  const alerts = [
    { type: "compliance", severity: "critical", message: "3 agents in South Sydney haven't logged a single client interaction in 14 days", action: "Review" },
    { type: "performance", severity: "warning", message: "Northern Beaches office conversion rate dropped 15% this month", action: "Analyze" },
    { type: "opportunity", severity: "info", message: "Sydney CBD office on track to beat quarterly target by 22%", action: "See how" },
    { type: "compliance", severity: "critical", message: "5 property listings missing mandatory energy efficiency certificates", action: "Fix now" },
  ];

  const topAgents = [
    { name: "Sarah Chen", office: "Sydney CBD", deals: 12, volume: ".2M", commission: "46K", trend: "up" },
    { name: "James Wilson", office: "Inner West", deals: 9, volume: ".8M", commission: "04K", trend: "up" },
    { name: "Emma Thompson", office: "Eastern Suburbs", deals: 7, volume: ".1M", commission: "53K", trend: "up" },
    { name: "Michael Brown", office: "Northern Beaches", deals: 4, volume: ".8M", commission: "4K", trend: "down" },
  ];

  const complianceIssues = [
    { agent: "John Smith", office: "South Sydney", issue: "Trust account reconciliation overdue by 12 days", risk: "high" },
    { agent: "Lisa Wang", office: "Western Sydney", issue: "License renewal expired 3 days ago", risk: "critical" },
    { agent: "David Park", office: "Northern Beaches", issue: "Missing signed agency agreement for 15 Smith St", risk: "high" },
  ];

  return (
    <div className="space-y-8">
      {/* Header — CEO-level, not agent-level */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Building2 className="w-3 h-3" />
            <span>Clippy Enterprise</span>
            <span>·</span>
            <span>Premier Realty Group</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Executive Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">6 offices · 247 agents · 87M active pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Settings className="w-4 h-4 inline mr-1" />
            Office settings
          </button>
        </div>
      </div>

      {/* CRITICAL ALERTS — red things that will get the CEO sued or lose money */}
      {alerts.filter(a => a.severity === "critical").length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-3">
            <AlertTriangle className="w-4 h-4" />
            Critical — requires your attention
          </div>
          <div className="space-y-2">
            {alerts.filter(a => a.severity === "critical").map((alert, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-sm text-foreground">{alert.message}</p>
                </div>
                <button className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 flex-shrink-0">{alert.action}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OFFICE PERFORMANCE GRID — the CEO scans this daily */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Office performance
          </h2>
          <div className="flex gap-1">
            {["all", "healthy", "warning", "critical"].map((f) => (
              <button key={f} onClick={() => setSelectedOffice(f)}
                className={"px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors " + (selectedOffice === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offices.filter(o => selectedOffice === "all" || o.status === selectedOffice).map((office) => (
            <div key={office.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">{office.name}</h3>
                <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold " + 
                  (office.status === "healthy" ? "bg-emerald-100 text-emerald-700" : 
                   office.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                  {office.growth}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-bold text-foreground">{office.agents}</p>
                  <p className="text-[10px] text-muted-foreground">Agents</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{office.pipeline}</p>
                  <p className="text-[10px] text-muted-foreground">Pipeline</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{office.revenue}</p>
                  <p className="text-[10px] text-muted-foreground">Monthly rev</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{office.growth}</p>
                  <p className="text-[10px] text-muted-foreground">Growth</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLIANCE & RISK — the thing that keeps CEOs up at night */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3">
          <Shield className="w-4 h-4" />
          Compliance & risk
        </div>
        <div className="space-y-2">
          {complianceIssues.map((issue, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-3">
                <span className={"w-2 h-2 rounded-full flex-shrink-0 " + (issue.risk === "critical" ? "bg-red-500" : "bg-amber-500")} />
                <div>
                  <p className="text-sm text-foreground">{issue.issue}</p>
                  <p className="text-xs text-muted-foreground">{issue.agent} · {issue.office}</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 flex-shrink-0">Resolve</button>
            </div>
          ))}
        </div>
      </div>

      {/* TOP AGENTS — the CEO wants to know who's performing and who's falling behind */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Agent performance
          </h2>
          <button className="text-xs text-primary hover:underline">View all 247 agents</button>
        </div>
        <div className="space-y-3">
          {topAgents.map((agent, i) => (
            <div key={i} className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className={"w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs " + (agent.trend === "up" ? "bg-emerald-500" : "bg-red-400")}>
                  {agent.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground">{agent.office}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{agent.deals} deals</p>
                  <p className="text-[10px] text-muted-foreground">{agent.volume}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{agent.commission}</p>
                  <p className="text-[10px] text-muted-foreground">Commission</p>
                </div>
                <span className={"text-xs font-semibold " + (agent.trend === "up" ? "text-emerald-500" : "text-red-500")}>
                  {agent.trend === "up" ? "▲" : "▼"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ENTERPRISE FEATURES — what the brokerage gets that individual agents don't */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground mb-4">Enterprise features included</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Shield, title: "Compliance automation", desc: "Auto-detect missing certificates, expired licenses, trust account issues before regulators do" },
            { icon: BarChart3, title: "Executive reporting", desc: "Real-time dashboards per office, per team, per agent. Export to PDF for board meetings" },
            { icon: Users, title: "Team management", desc: "Role-based access, lead routing, performance reviews, commission tracking" },
            { icon: Globe, title: "Multi-office", desc: "Unlimited offices, centralized billing, cross-office lead sharing, brand consistency" },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="p-4 rounded-lg bg-muted/50">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="text-sm font-semibold text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ENTERPRISE CTA */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-6 text-center">
        <h2 className="text-lg font-bold text-foreground">Take Clippy enterprise-wide</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">Get centralized billing, compliance monitoring, executive dashboards, white-label branding, and dedicated support for your entire brokerage.</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">Schedule a demo</button>
          <button className="px-6 py-2.5 border border-border rounded-full text-sm text-muted-foreground hover:bg-muted transition-colors">View enterprise pricing</button>
        </div>
      </div>
    </div>
  );
}
