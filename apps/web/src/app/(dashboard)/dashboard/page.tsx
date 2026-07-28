"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

interface UserContext {
  name: string;
  agencyName: string | null;
  role: string;
}

interface DashboardStats {
  now: {
    conversations_active: number;
    messages_today: number;
    ai_messages: number;
    lead_messages: number;
    new_leads_today: number;
    inspections_booked_today: number;
    applications_started_today: number;
    pending_escalations: number;
  };
  week: {
    new_leads: number;
    inspections_booked: number;
    inspections_attended: number;
    inspections_no_show: number;
    applications_submitted: number;
    applications_approved: number;
  };
  pipeline: {
    hot_leads: number;
    warm_leads: number;
    total_leads: number;
    by_stage: Record<string, number>;
  };
  performance: {
    avg_response_time_seconds: number;
    response_rate: number;
    ai_handled_percent: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserContext | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const identityResponse = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (identityResponse.status === 401) {
          router.replace("/sign-in?next=%2Fdashboard");
          return;
        }

        const identity = await identityResponse.json();
        if (!identityResponse.ok)
          throw new Error(identity.error || "Unable to load your profile");

        const dashboardResponse = await fetch("/api/principal/dashboard", {
          cache: "no-store",
          credentials: "include",
        });
        if (dashboardResponse.status === 401) {
          router.replace("/sign-in?next=%2Fdashboard");
          return;
        }

        const dashboard = await dashboardResponse.json();
        if (!dashboardResponse.ok) {
          throw new Error(
            dashboard.error || "Unable to load today’s operations",
          );
        }

        if (!active) return;
        setUser(identity as UserContext);
        setStats(dashboard as DashboardStats);
      } catch (reason: unknown) {
        if (!active) return;
        setError(
          reason instanceof Error ? reason.message : "Unable to load dashboard",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [router]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 22) return "Good evening";
    return "Welcome back";
  }, []);

  const replies = stats?.now.ai_messages ?? 0;
  const inspections = stats?.now.inspections_booked_today ?? 0;
  const hotLeads = stats?.pipeline.hot_leads ?? 0;
  const warmLeads = stats?.pipeline.warm_leads ?? 0;
  const responseTime = stats?.performance.avg_response_time_seconds ?? 0;
  const pendingEscalations = stats?.now.pending_escalations ?? 0;
  const unansweredSignals = Math.max(
    (stats?.now.lead_messages ?? 0) - (stats?.now.ai_messages ?? 0),
    0,
  );
  const priorityLeads = hotLeads + warmLeads;

  const cards = [
    { label: "AI replies today", value: replies, icon: MessageCircle },
    { label: "Inspections booked", value: inspections, icon: Calendar },
    { label: "Priority leads", value: priorityLeads, icon: Users },
    {
      label: "Average response",
      value: responseTime > 0 ? `${responseTime}s` : "—",
      icon: Clock,
    },
  ];

  const recommendations = [
    pendingEscalations > 0
      ? {
          title: `Review ${pendingEscalations} ${pendingEscalations === 1 ? "escalation" : "escalations"}`,
          detail:
            "Clippy has paused these conversations because human judgement is required.",
          action: "Review conversations",
          href: "/inbox",
        }
      : {
          title: "No escalations waiting",
          detail:
            "Clippy has not identified an urgent conversation requiring human judgement.",
          action: "View conversations",
          href: "/inbox",
        },
    hotLeads > 0
      ? {
          title: `Contact ${hotLeads} hot ${hotLeads === 1 ? "lead" : "leads"}`,
          detail: "These people are showing the strongest current intent.",
          action: "Open opportunities",
          href: "/deals",
        }
      : {
          title: "Build the opportunity pipeline",
          detail:
            "Qualify new conversations so Clippy can identify high-intent prospects.",
          action: "View opportunities",
          href: "/deals",
        },
    unansweredSignals > 0
      ? {
          title: `${unansweredSignals} ${unansweredSignals === 1 ? "message may" : "messages may"} need attention`,
          detail:
            "There are more lead messages than AI replies recorded today.",
          action: "Check conversations",
          href: "/inbox",
        }
      : {
          title:
            inspections > 0
              ? "Prepare today’s inspections"
              : "Create the next inspection",
          detail:
            inspections > 0
              ? `${inspections} confirmed ${inspections === 1 ? "booking is" : "bookings are"} recorded today.`
              : "Ask Clippy which engaged prospects may be ready to inspect.",
          action: inspections > 0 ? "View properties" : "Ask Clippy",
          href: inspections > 0 ? "/inspections" : "/copilot",
        },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6 pb-32 md:pb-6">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pb-32 md:pb-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-neutral-50 p-4 pb-32 sm:p-6 md:pb-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-5 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-md">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              {greeting}, {user?.name ?? "Agent"}
            </h1>
            <p className="mt-1 text-neutral-600">
              {user?.agencyName
                ? `${user.agencyName} · ${user.role}`
                : user?.role}
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              {new Date().toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Needs your attention
            </p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">
              Your next best actions
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Prioritised from live conversations, escalations and
              opportunities.
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {recommendations.map((item, index) => (
            <article
              key={item.title}
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {index + 1}
              </div>
              <h3 className="mt-3 font-semibold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-1 min-h-10 text-sm text-neutral-600">
                {item.detail}
              </p>
              <a
                href={item.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {item.action}
                <ArrowRight className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-neutral-500 md:text-sm">{label}</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {value}
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
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
            <h2 className="font-semibold text-neutral-900">
              Completed by Clippy
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-sm text-neutral-700">
                Sent or recorded <strong>{replies}</strong> AI replies today.
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
              <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-sm text-neutral-700">
                Recorded <strong>{inspections}</strong> confirmed inspection
                bookings today.
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
              <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-sm text-neutral-700">
                Identified <strong>{hotLeads}</strong> hot and{" "}
                <strong>{warmLeads}</strong> warm leads.
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
              <Zap className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-sm text-neutral-700">
                Handled{" "}
                <strong>{stats?.performance.ai_handled_percent ?? 0}%</strong>{" "}
                of recorded messages with AI.
              </span>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-neutral-900">
            Opportunity pipeline
          </h2>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {priorityLeads}
          </p>
          <p className="mt-1 text-sm text-neutral-600">Hot and warm leads</p>
          <p className="mt-3 text-sm text-neutral-700">
            <strong>{stats?.pipeline.total_leads ?? 0}</strong> total leads are
            currently tracked.
          </p>
          <a
            href="/copilot"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ask Clippy what to do next
            <ArrowRight className="h-4 w-4" />
          </a>
        </article>
      </section>
    </div>
  );
}
