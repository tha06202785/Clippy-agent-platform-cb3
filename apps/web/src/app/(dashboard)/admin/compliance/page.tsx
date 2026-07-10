"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, Search, FileText, UserCheck, XCircle } from "lucide-react";

const issues = [
  { id: "1", agent: "John Smith", office: "South Sydney", type: "Trust account", issue: "Trust account reconciliation overdue by 12 days", risk: "high", daysOpen: 12, status: "open" },
  { id: "2", agent: "Lisa Wang", office: "Western Sydney", type: "License", issue: "License renewal expired 3 days ago", risk: "critical", daysOpen: 3, status: "open" },
  { id: "3", agent: "David Park", office: "South Sydney", type: "Agency agreement", issue: "Missing signed agency agreement for 15 Smith St", risk: "high", daysOpen: 8, status: "open" },
  { id: "4", agent: "Michael Brown", office: "Northern Beaches", type: "Certificate", issue: "Energy efficiency certificate missing for 3 listings", risk: "medium", daysOpen: 5, status: "open" },
  { id: "5", agent: "Emma Thompson", office: "Eastern Suburbs", type: "Continuing education", issue: "CPD hours not met for 2026", risk: "medium", daysOpen: 30, status: "open" },
  { id: "6", agent: "Sarah Chen", office: "Sydney CBD", type: "Advertising", issue: "Property advertisement missing mandatory compliance statement", risk: "low", daysOpen: 2, status: "resolved" },
];

const stats = {
  critical: issues.filter(i => i.risk === "critical").length,
  high: issues.filter(i => i.risk === "high").length,
  medium: issues.filter(i => i.risk === "medium").length,
  resolved: issues.filter(i => i.status === "resolved").length,
  total: issues.length,
};

export default function CompliancePage() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? issues : issues.filter(i => i.risk === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor regulatory compliance across your brokerage</p>
        </div>
        <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2">
          <FileText className="w-4 h-4" /> Export report
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Critical", count: stats.critical, color: "bg-red-500", textColor: "text-red-600" },
          { label: "High", count: stats.high, color: "bg-amber-500", textColor: "text-amber-600" },
          { label: "Medium", count: stats.medium, color: "bg-yellow-500", textColor: "text-yellow-600" },
          { label: "Resolved", count: stats.resolved, color: "bg-emerald-500", textColor: "text-emerald-600" },
          { label: "Total", count: stats.total, color: "bg-primary", textColor: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className={"w-8 h-8 rounded-full " + s.color + " flex items-center justify-center mx-auto mb-2"}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <p className={"text-xl font-bold " + s.textColor}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {["all", "critical", "high", "medium", "low", "resolved"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={"px-3 py-1.5 rounded-full text-xs font-medium transition-colors " + (filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((issue) => (
          <div key={issue.id} className={"rounded-xl border p-4 " + (issue.risk === "critical" ? "border-red-200 bg-red-50" : issue.risk === "high" ? "border-amber-200 bg-amber-50/50" : "border-border bg-card")}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className={"w-2 h-2 rounded-full mt-1.5 flex-shrink-0 " + (issue.risk === "critical" ? "bg-red-500" : issue.risk === "high" ? "bg-amber-500" : issue.risk === "medium" ? "bg-yellow-500" : "bg-emerald-500")} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{issue.issue}</span>
                    <span className={"text-[10px] font-semibold px-1.5 py-0.5 rounded-full " + (issue.risk === "critical" ? "bg-red-100 text-red-700" : issue.risk === "high" ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700")}>
                      {issue.risk}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{issue.agent} · {issue.office} · {issue.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {issue.daysOpen}d open
                </div>
                {issue.status === "open" ? (
                  <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90">Resolve</button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <CheckCircle className="w-3 h-3" /> Resolved
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
