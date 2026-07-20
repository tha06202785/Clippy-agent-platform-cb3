"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";

interface DashboardStats {
  leads: { total: number; new: number };
  listings: { total: number; active: number };
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        else if (data.leads || data.listings) setStats(data);
        else if (data.error === "No org found") {
          // Gracefully handle missing org — user exists but isn't linked to an org yet
          setStats({ leads: { total: 0, new: 0 }, listings: { total: 0, active: 0 } });
        } else {
          setError(data.error || "Failed to load");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-muted-foreground mt-1">Loading your pipeline...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-5 w-5 bg-muted rounded mb-3" />
              <div className="h-8 w-20 bg-muted rounded mb-1" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Leads", value: String(stats?.leads?.total || 0), change: "+" + (stats?.leads?.new || 0) + " new", icon: Users, color: "text-blue-600" },
    { label: "Active Listings", value: String(stats?.listings?.active || 0), change: String(stats?.listings?.total || 0) + " total", icon: TrendingUp, color: "text-emerald-600" },
    { label: "Response Time", value: "<5 min", change: "AI powered", icon: Clock, color: "text-amber-600" },
    { label: "Pipeline", value: String(stats?.leads?.total || 0) + " leads", change: String(stats?.listings?.active || 0) + " listings", icon: DollarSign, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
        <p className="text-muted-foreground mt-1">Here is your pipeline overview for today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
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
        {stats?.leads?.total === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No leads yet. Connect your first integration to get started.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Your pipeline is active with {stats?.leads?.total || 0} leads and {stats?.listings?.active || 0} active listings.</p>
        )}
      </div>
    </div>
  );
}
