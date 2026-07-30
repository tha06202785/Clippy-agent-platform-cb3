"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

export type CalendarWorkspaceEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  source: "google" | "inspection";
  status: string | null;
  client: { id: string; name: string | null } | null;
  property: { id: string; address: string | null } | null;
};

type CalendarConnection = {
  connected: boolean;
  status: string;
  lastSyncAt: string | null;
  itemsIndexed: number;
};

const VIEWS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Next 7 days" },
  { id: "all", label: "All upcoming" },
] as const;

function dayKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Australia/Melbourne",
  }).formatToParts(new Date(value));
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

function shortDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

function eventTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

function eventDuration(start: string, end: string | null) {
  if (!end) return eventTime(start);
  return `${eventTime(start)}–${eventTime(end)}`;
}

function relativeSync(value: string | null, generatedAt: string) {
  if (!value) return "Not synced yet";
  const syncedAt = new Date(value).getTime();
  const renderedAt = new Date(generatedAt).getTime();
  if (!Number.isFinite(syncedAt) || !Number.isFinite(renderedAt)) {
    return "Sync time unavailable";
  }
  const minutes = Math.max(0, Math.floor((renderedAt - syncedAt) / 60_000));
  if (minutes < 2) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}

export function CalendarWorkspace({
  events,
  connection,
  generatedAt,
}: {
  events: CalendarWorkspaceEvent[];
  connection: CalendarConnection;
  generatedAt: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("today");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, startSync] = useTransition();

  const today = dayKey(generatedAt);
  const nextWeek = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(generatedAt);
        date.setUTCDate(date.getUTCDate() + index);
        return date.toISOString();
      }),
    [generatedAt],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const weekEnd = new Date(generatedAt).getTime() + 7 * 86_400_000;
    return events.filter((event) => {
      const eventDay = dayKey(event.starts_at);
      const startsAt = new Date(event.starts_at).getTime();
      const matchesView =
        selectedDay !== null
          ? eventDay === selectedDay
          : view === "today"
            ? eventDay === today
            : view === "week"
              ? startsAt >= new Date(generatedAt).getTime() &&
                startsAt < weekEnd
              : true;
      const matchesSearch =
        !term ||
        [
          event.title,
          event.location,
          event.client?.name,
          event.property?.address,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term));
      return matchesView && matchesSearch;
    });
  }, [events, generatedAt, search, selectedDay, today, view]);

  const groups = useMemo(() => {
    const result = new Map<string, CalendarWorkspaceEvent[]>();
    for (const event of filtered) {
      const key = dayKey(event.starts_at);
      result.set(key, [...(result.get(key) || []), event]);
    }
    return Array.from(result.entries());
  }, [filtered]);

  const todayCount = events.filter(
    (event) => dayKey(event.starts_at) === today,
  ).length;
  const inspectionCount = events.filter(
    (event) => event.source === "inspection",
  ).length;

  const syncCalendar = () => {
    setSyncError(null);
    setSyncMessage(null);
    startSync(async () => {
      try {
        const response = await fetch("/api/integrations/sync", {
          method: "POST",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || "Calendar could not be synced.");
        }
        setSyncMessage(
          `${result.calendar?.total || 0} calendar events are available.`,
        );
        router.refresh();
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? error.message
            : "Calendar could not be synced.",
        );
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-blue-50/80 to-emerald-50/80 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700">
              <CalendarDays className="h-3.5 w-3.5" />
              Agent calendar workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              One schedule. Every next action.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
              See Google Calendar events and Clippy inspection bookings
              together, then open the linked client or property before taking
              action.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`rounded-2xl border px-4 py-3 ${
                connection.connected
                  ? "border-emerald-200 bg-white/80"
                  : "border-orange-200 bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    connection.connected ? "bg-emerald-500" : "bg-orange-500"
                  }`}
                />
                <span className="text-xs font-bold text-neutral-800">
                  {connection.connected
                    ? "Google Calendar connected"
                    : "Calendar needs attention"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {relativeSync(connection.lastSyncAt, generatedAt)}
              </p>
            </div>
            {connection.connected ? (
              <button
                type="button"
                onClick={syncCalendar}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing…" : "Sync now"}
              </button>
            ) : (
              <Link
                href="/integrations"
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Connect calendar
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {(syncError || syncMessage) && (
          <div
            role={syncError ? "alert" : "status"}
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              syncError
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {syncError || syncMessage}
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Today", value: todayCount, icon: CalendarDays },
            { label: "Upcoming", value: events.length, icon: Clock3 },
            {
              label: "Inspections",
              value: inspectionCount,
              icon: Building2,
            },
            {
              label: "Indexed",
              value: connection.itemsIndexed,
              icon: CheckCircle2,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4"
            >
              <metric.icon className="h-4 w-4 text-emerald-600" />
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {metric.value}
              </div>
              <div className="text-[11px] font-medium text-neutral-500">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white shadow-soft">
        <div className="space-y-4 border-b border-neutral-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setView(option.id);
                    setSelectedDay(null);
                  }}
                  aria-pressed={selectedDay === null && view === option.id}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    selectedDay === null && view === option.id
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search calendar"
                placeholder="Search events, clients or properties"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {nextWeek.map((date) => {
              const key = dayKey(date);
              const count = events.filter(
                (event) => dayKey(event.starts_at) === key,
              ).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSelectedDay((current) => (current === key ? null : key))
                  }
                  aria-pressed={selectedDay === key}
                  className={`min-w-0 rounded-xl border px-1 py-2 text-center transition sm:px-2 ${
                    selectedDay === key
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : key === today
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span className="block truncate text-[10px] font-bold sm:text-xs">
                    {shortDayLabel(date)}
                  </span>
                  <span className="mt-1 block text-[9px] text-neutral-400">
                    {count} event{count === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-neutral-300" />
            <h2 className="mt-4 font-semibold text-neutral-900">
              No events in this view
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
              Try another date or sync Google Calendar to bring the latest
              appointments into Clippy.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {groups.map(([key, dayEvents]) => (
              <div key={key} className="p-4 sm:p-5">
                <h2 className="text-sm font-bold text-neutral-900">
                  {dayLabel(dayEvents[0].starts_at)}
                </h2>
                <div className="mt-3 space-y-3">
                  {dayEvents.map((event) => (
                    <article
                      key={`${event.source}-${event.id}`}
                      className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 transition hover:border-emerald-300 hover:bg-white hover:shadow-md sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center [&]:[content-visibility:auto]"
                    >
                      <div>
                        <p className="text-sm font-bold text-neutral-900">
                          {eventDuration(event.starts_at, event.ends_at)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            event.source === "inspection"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {event.source === "inspection"
                            ? "Clippy inspection"
                            : "Google Calendar"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-neutral-900">
                          {event.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                          {event.location && (
                            <span className="flex min-w-0 items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                          {event.client && (
                            <Link
                              href={`/clients/${event.client.id}`}
                              className="flex items-center gap-1 font-semibold text-blue-700"
                            >
                              <UserRound className="h-3 w-3" />
                              {event.client.name || "Client 360"}
                            </Link>
                          )}
                          {event.property && (
                            <Link
                              href={`/property/${event.property.id}`}
                              className="flex items-center gap-1 font-semibold text-emerald-700"
                            >
                              <Building2 className="h-3 w-3" />
                              {event.property.address || "Property 360"}
                            </Link>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/copilot?calendar_event_id=${event.id}&calendar_source=${event.source === "google" ? "google" : "inspection"}`}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Open Clippy
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
