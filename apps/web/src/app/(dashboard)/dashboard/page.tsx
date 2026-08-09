"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  MessageCircle,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

type Recommendation = {
  kind: string;
  priority: "urgent" | "high" | "normal";
  title: string;
  detail: string;
  action: string;
  href: string;
};

type ActivityEvidence = {
  id: string;
  title: string;
  description: string | null;
  impact_summary: string | null;
  completed_at: string | null;
};

interface DashboardData {
  generated_at: string;
  reporting_time_zone: string;
  viewer: {
    name: string;
    agency_name: string | null;
    role: string;
  };
  clippy: {
    state: "evidence_unavailable" | "evidenced" | "no_evidence";
    headline: string;
    recommendations: Recommendation[];
    completed: {
      verified_outbound_deliveries: number;
      outbound_messages_recorded: number;
      verified_activity_count: number | null;
      recent_activity: ActivityEvidence[] | null;
    };
  };
  now: {
    conversations_active: number;
    new_leads_today: number;
    urgent_tasks: number;
    due_tasks: number;
    pending_tasks: number;
    pending_inspection_tasks: number;
  };
  week: {
    new_leads: number;
  };
  pipeline: {
    hot_leads: number;
    warm_leads: number;
    total_leads: number;
  };
  performance: {
    inbound_bursts: number;
    answered_bursts: number;
    outbound_messages_recorded: number;
    outbound_messages_with_external_id: number;
    avg_response_time_seconds: number | null;
    response_coverage_percent: number | null;
  };
  data_quality: {
    activity_log_available: boolean;
    delivery_evidence_available: boolean;
    message_scope: string;
    inspection_bookings_available: boolean;
    rental_applications_available: boolean;
  };
}

function formatResponseTime(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/principal/dashboard", {
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/sign-in?next=%2Fdashboard");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load today’s operations");
        }

        if (active) setDashboard(data as DashboardData);
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
    const hour = Number(
      new Intl.DateTimeFormat("en-AU", {
        timeZone: dashboard?.reporting_time_zone || "Australia/Melbourne",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 22) return "Good evening";
    return "Welcome back";
  }, [dashboard?.reporting_time_zone]);

  if (loading) {
    return (
      <div className="space-y-6 p-6 pb-32 md:pb-6">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6 pb-32 md:pb-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-sm text-red-700">
            {error || "No dashboard data was returned."}
          </p>
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

  const completed = dashboard.clippy.completed;
  const performance = dashboard.performance;
  const priorityLeads =
    dashboard.pipeline.hot_leads + dashboard.pipeline.warm_leads;
  const clippyNeedsAttention = dashboard.clippy.state !== "evidenced";

  const cards = [
    {
      label: "Verified deliveries",
      value: completed.verified_outbound_deliveries,
      detail: "Outbound messages with provider or delivery evidence",
      icon: Send,
    },
    {
      label: "New leads today",
      value: dashboard.now.new_leads_today,
      detail: "Organisation-scoped leads created today",
      icon: Users,
    },
    {
      label: "Response coverage",
      value:
        performance.response_coverage_percent === null
          ? "—"
          : `${performance.response_coverage_percent}%`,
      detail:
        performance.inbound_bursts > 0
          ? `${performance.answered_bursts} of ${performance.inbound_bursts} enquiry bursts answered`
          : "No inbound enquiry burst recorded today",
      icon: MessageCircle,
    },
    {
      label: "Average response",
      value: formatResponseTime(performance.avg_response_time_seconds),
      detail: "Across answered enquiry bursts today",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6 bg-neutral-50 p-4 pb-32 sm:p-6 md:pb-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-5 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-md">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              {greeting}, {dashboard.viewer.name}
            </h1>
            <p className="mt-1 text-neutral-600">
              {dashboard.viewer.agency_name
                ? `${dashboard.viewer.agency_name} · ${dashboard.viewer.role}`
                : dashboard.viewer.role}
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              {new Date(dashboard.generated_at).toLocaleDateString("en-AU", {
                timeZone: dashboard.reporting_time_zone,
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-5 shadow-sm md:p-6 ${
          clippyNeedsAttention
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-wider ${
                clippyNeedsAttention ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              How Clippy is doing
            </p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">
              {dashboard.clippy.headline}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {completed.verified_outbound_deliveries} verified outbound{" "}
              {completed.verified_outbound_deliveries === 1
                ? "delivery"
                : "deliveries"}{" "}
              and {completed.outbound_messages_recorded} outbound conversation{" "}
              {completed.outbound_messages_recorded === 1
                ? "record"
                : "records"}{" "}
              are visible today. Clippy only claims completed work when the
              activity ledger records it.
            </p>
          </div>
          <div
            className={`rounded-xl p-3 ${
              clippyNeedsAttention ? "bg-amber-100" : "bg-emerald-100"
            }`}
          >
            {clippyNeedsAttention ? (
              <AlertCircle className="h-5 w-5 text-amber-700" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-700" />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Clippy recommends
            </p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">
              Your next best actions
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Prioritised from unresolved exceptions and current opportunity
              signals.
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {dashboard.clippy.recommendations.map((item, index) => (
            <article
              key={`${item.kind}-${item.title}`}
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {index + 1}
                </div>
                {item.priority !== "normal" && (
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      item.priority === "urgent"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.priority}
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-semibold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-1 min-h-10 text-sm text-neutral-600">
                {item.detail}
              </p>
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {item.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
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
            <p className="mt-3 text-xs leading-5 text-neutral-500">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-neutral-900">
              Verified Clippy activity
            </h2>
          </div>

          {!dashboard.data_quality.activity_log_available ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              The activity ledger is unavailable, so Clippy is not claiming
              unverified work here. Delivery and booking evidence above remains
              available.
            </div>
          ) : completed.recent_activity?.length ? (
            <div className="mt-4 space-y-3">
              {completed.recent_activity.slice(0, 4).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3"
                >
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-neutral-800">
                      {activity.title}
                    </p>
                    {(activity.impact_summary || activity.description) && (
                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        {activity.impact_summary || activity.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
              No completed activity-ledger entries are recorded for today yet.
            </div>
          )}
        </article>

        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
            <h2 className="font-semibold text-neutral-900">
              Opportunity pipeline
            </h2>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {priorityLeads}
          </p>
          <p className="mt-1 text-sm text-neutral-600">Hot and warm leads</p>
          <div className="mt-4 space-y-2 text-sm text-neutral-700">
            <p>
              <strong>{dashboard.pipeline.hot_leads}</strong> hot leads
            </p>
            <p>
              <strong>{dashboard.pipeline.warm_leads}</strong> warm leads
            </p>
            <p>
              <strong>{dashboard.pipeline.total_leads}</strong> total leads
              tracked
            </p>
          </div>
          <Link
            href="/copilot"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ask Clippy what to do next
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-neutral-200 bg-white p-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {dashboard.week.new_leads}
          </p>
          <p className="text-sm text-neutral-500">New leads this week</p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-4">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {dashboard.performance.answered_bursts}
          </p>
          <p className="text-sm text-neutral-500">Enquiry bursts answered today</p>
        </article>
        <article className="rounded-xl border border-neutral-200 bg-white p-4">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {dashboard.now.due_tasks}
          </p>
          <p className="text-sm text-neutral-500">Tasks due or overdue</p>
        </article>
      </section>
    </div>
  );
}
