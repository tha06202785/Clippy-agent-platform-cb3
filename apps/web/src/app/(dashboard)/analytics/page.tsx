"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Zap,
  MessageSquare,
} from "lucide-react";

interface AnalyticsStats {
  leads?: { total?: number; new?: number; limit?: number };
  listings?: { active?: number; total?: number; limit?: number };
  ai_replies?: { used?: number; limit?: number };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load performance data");
        setStats(data.stats || data);
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load performance data",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    {
      label: "Total Leads",
      value: stats?.leads?.total ?? 0,
      icon: Users,
      color: "text-blue-600",
      change: `+${stats?.leads?.new ?? 0} this month`,
    },
    {
      label: "Active Listings",
      value: stats?.listings?.active ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      change: `${stats?.listings?.total ?? 0} total`,
    },
    {
      label: "AI Replies Used",
      value: stats?.ai_replies?.used ?? 0,
      icon: Zap,
      color: "text-purple-600",
      change: `of ${stats?.ai_replies?.limit ?? 50} limit`,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">
          Performance unavailable
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Usage metrics and performance data
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={"w-5 h-5 " + m.color} />
                <span className="text-xs text-muted-foreground">
                  {m.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Usage Overview
        </h2>
        <div className="space-y-4">
          {[
            {
              label: "AI Replies",
              used: stats?.ai_replies?.used || 0,
              limit: stats?.ai_replies?.limit || 50,
            },
            {
              label: "Listings",
              used: stats?.listings?.total || 0,
              limit: stats?.listings?.limit || 5,
            },
            {
              label: "Leads",
              used: stats?.leads?.total || 0,
              limit: stats?.leads?.limit || 100,
            },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.used} / {item.limit === -1 ? "Unlimited" : item.limit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width:
                      item.limit === -1
                        ? "100%"
                        : Math.min(100, (item.used / item.limit) * 100) + "%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Recent Activity
        </h2>
        {stats?.leads?.total === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>
              No activity yet. Connect integrations and start working with
              leads.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {stats?.leads?.total ?? 0} leads tracked,{" "}
            {stats?.listings?.active ?? 0} active listings.
            {(stats?.leads?.new ?? 0) > 0
              ? ` ${stats?.leads?.new ?? 0} new this month.`
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
