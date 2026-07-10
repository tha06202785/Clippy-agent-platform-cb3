"use client";

import { useUser } from "@clerk/nextjs";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";

const stats = [
  { label: "Active Leads", value: "24", change: "+12%", icon: Users, color: "text-blue-600" },
  { label: "Pipeline Value", value: ".2M", change: "+8%", icon: DollarSign, color: "text-emerald-600" },
  { label: "Response Time", value: "<5 min", change: "-30%", icon: Clock, color: "text-amber-600" },
  { label: "Conversion", value: "68%", change: "+5%", icon: TrendingUp, color: "text-purple-600" },
];

export function DashboardPage() {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}, {user?.firstName || "there"}</h1>
        <p className="text-muted-foreground mt-1">Here is your pipeline overview for today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <Icon className={"w-5 h-5 " + stat.color} />
                <span className="text-xs font-medium text-emerald-500">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: "New lead assigned", detail: "Sarah Johnson - 3 bed house in Paddington", time: "5m ago" },
            { action: "Deal stage changed", detail: "123 Main St moved to offer stage", time: "1h ago" },
            { action: "AI draft generated", detail: "Follow-up drafted for James Wilson", time: "2h ago" },
            { action: "Tour scheduled", detail: "Friday 2pm - 45 Smith Street", time: "3h ago" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
