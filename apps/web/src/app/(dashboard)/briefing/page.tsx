"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Flame,
  Inbox,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";

type DailyAction = {
  id: string;
  priority: "urgent" | "high" | "normal";
  type: "follow_up" | "hot_lead" | "unread" | "inspection";
  title: string;
  reason: string;
  href: string;
  cta: string;
};

type BriefingData = {
  date: string;
  summary: string;
  actions: DailyAction[];
  metrics: {
    conversations_handled: number;
    new_leads: number;
    inspections_booked: number;
    hot_leads: number;
    unread_messages: number;
    overdue_followups: number;
    response_rate: number;
  };
};

const priorityStyles = {
  urgent: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  normal: "border-border bg-card text-foreground",
};

const actionIcons = {
  follow_up: Clock3,
  hot_lead: Flame,
  unread: Inbox,
  inspection: Calendar,
};

export default function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/briefing/daily", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to load briefing");
      setData(result);
    } catch (briefingError) {
      setError(
        briefingError instanceof Error
          ? briefingError.message
          : "Failed to load briefing",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Daily plan unavailable</h2>
        <p className="mt-2 max-w-md text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={loadBriefing}
          className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const urgentCount = data.actions.filter(
    (action) => action.priority === "urgent",
  ).length;

  const metrics = [
    {
      label: "Overdue",
      value: data.metrics.overdue_followups,
      icon: Clock3,
      colour: "text-red-500",
    },
    {
      label: "Unread",
      value: data.metrics.unread_messages,
      icon: Inbox,
      colour: "text-blue-500",
    },
    {
      label: "Hot clients",
      value: data.metrics.hot_leads,
      icon: Flame,
      colour: "text-amber-500",
    },
    {
      label: "Inspections",
      value: data.metrics.inspections_booked,
      icon: Calendar,
      colour: "text-purple-500",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Sun className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">{greeting}</h1>
            <p className="mt-1 text-muted-foreground">
              {new Date(data.date).toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {" · "}Your Copilot daily action plan
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadBriefing}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh plan
        </button>
      </div>

      <div
        className={`rounded-2xl border p-6 ${urgentCount ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}
      >
        <div className="flex items-start gap-3">
          <Sparkles
            className={`mt-0.5 h-5 w-5 ${urgentCount ? "text-red-600" : "text-emerald-600"}`}
          />
          <div>
            <h2
              className={`font-semibold ${urgentCount ? "text-red-900" : "text-emerald-900"}`}
            >
              Clippy recommends
            </h2>
            <p
              className={`mt-1 leading-relaxed ${urgentCount ? "text-red-700" : "text-emerald-700"}`}
            >
              {data.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <metric.icon className={`h-5 w-5 ${metric.colour}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Today’s priorities</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordered by urgency. Each action opens the correct CRM context;
            nothing is sent automatically.
          </p>
        </div>

        {data.actions.length ? (
          <div className="divide-y">
            {data.actions.map((action, index) => {
              const Icon = actionIcons[action.type];
              return (
                <div
                  key={action.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                      {index + 1}
                    </span>
                    <div
                      className={`rounded-xl border p-2 ${priorityStyles[action.priority]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{action.title}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyles[action.priority]}`}
                        >
                          {action.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {action.reason}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={action.href}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {action.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold">You are caught up</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              New client actions will appear here automatically.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/clients"
          className="rounded-xl border bg-card p-4 hover:bg-muted"
        >
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-2 font-semibold">Client 360</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review every client and enquiry.
          </p>
        </Link>
        <Link
          href="/inbox"
          className="rounded-xl border bg-card p-4 hover:bg-muted"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
          <p className="mt-2 font-semibold">Inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review conversations and approve replies.
          </p>
        </Link>
        <Link
          href="/calendar"
          className="rounded-xl border bg-card p-4 hover:bg-muted"
        >
          <Calendar className="h-5 w-5 text-primary" />
          <p className="mt-2 font-semibold">Calendar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reminders and inspections.
          </p>
        </Link>
      </div>
    </div>
  );
}
