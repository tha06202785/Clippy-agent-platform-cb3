"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Calendar, CheckCircle, Clock, DollarSign, MessageCircle, Sparkles, TrendingUp, Users, Zap } from "lucide-react";

interface UserContext {
  name: string;
  agencyName: string | null;
  role: string;
}

interface DashboardStats {
  conversations?: { today?: number };
  inspections?: { today?: number };
  hotLeads?: unknown[];
  pipelineValue?: number;
  responseTime?: number;
  commissionGenerated?: number;
  timeSaved?: number;
  repliesToday?: number;
  aiScore?: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserContext | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/me", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your profile");
        return data as UserContext;
      }),
      fetch("/api/principal/dashboard", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return {};
          return (await response.json()) as DashboardStats;
        })
        .catch(() => ({})),
    ])
      .then(([identity, dashboard]) => {
        if (!active) return;
        setUser(identity);
        setStats(dashboard);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 22) return "Good evening";
    return "Welcome back";
  }, []);

  const cards = [
    { label: "Replies today", value: stats.repliesToday ?? stats.conversations?.today ?? 0, icon: MessageCircle },
    { label: "Inspections booked", value: stats.inspections?.today ?? 0, icon: Calendar },
    { label: "Hot leads", value: stats.hotLeads?.length ?? 0, icon: Users },
    { label: "Average response", value: `${stats.responseTime ?? 0}s`, icon: Clock },
    { label: "AI productivity", value: `${stats.aiScore ?? 0}%`, icon: Sparkles },
    { label: "Time saved", value: `${stats.timeSaved ?? 0}h`, icon: Zap },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-neutral-50 p-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-md">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">{greeting}, {user?.name ?? "Agent"}</h1>
            <p className="mt-1 text-neutral-600">
              {user?.agencyName ? `${user.agencyName} · ${user.role}` : user?.role}
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <Icon className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-neutral-900">Clippy activity</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-neutral-600">
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><CheckCircle className="h-4 w-4 text-emerald-600" />Authenticated profile and agency context loaded.</div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><TrendingUp className="h-4 w-4 text-emerald-600" />Lead and pipeline metrics are scoped to your organisation.</div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><Zap className="h-4 w-4 text-emerald-600" />Copilot is ready with your agency context.</div>
          </div>
        </article>

        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-neutral-900">Pipeline value</h2>
          <p className="mt-3 text-3xl font-bold text-emerald-700">${(stats.pipelineValue ?? 0).toLocaleString("en-AU")}</p>
          <p className="mt-2 text-sm text-neutral-600">Potential commission: ${(stats.commissionGenerated ?? 0).toLocaleString("en-AU")}</p>
          <a href="/copilot" className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Ask Clippy
          </a>
        </article>
      </section>
    </div>
  );
}
