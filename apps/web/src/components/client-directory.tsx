"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";

export type ClientDirectoryItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  priority: string | null;
  ai_score: number | null;
  last_activity_at: string | null;
  created_at: string;
  property_enquiries: Array<{
    id: string;
  }>;
};

const FILTERS = [
  { id: "all", label: "All clients" },
  { id: "hot", label: "Hot" },
  { id: "active", label: "Active enquiries" },
  { id: "unmatched", label: "No property linked" },
] as const;

function initials(name: string | null) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function relativeActivity(
  value: string | null,
  fallback: string,
  generatedAt: string,
) {
  const timestamp = new Date(value || fallback).getTime();
  if (Number.isNaN(timestamp)) return "Unknown";
  const days = Math.max(
    0,
    Math.floor((new Date(generatedAt).getTime() - timestamp) / 86_400_000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function ClientDirectory({
  clients,
  generatedAt,
}: {
  clients: ClientDirectoryItem[];
  generatedAt: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !term ||
        [client.full_name, client.email, client.phone]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term));
      const matchesFilter =
        filter === "all" ||
        (filter === "hot" && client.priority === "hot") ||
        (filter === "active" && client.property_enquiries.length > 0) ||
        (filter === "unmatched" && client.property_enquiries.length === 0);
      return matchesSearch && matchesFilter;
    });
  }, [clients, filter, search]);

  const activeRelationships = clients.reduce(
    (total, client) => total + client.property_enquiries.length,
    0,
  );
  const hotClients = clients.filter(
    (client) => client.priority === "hot",
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-emerald-50/70 to-blue-50/80 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Client relationship workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Every client, every property interest.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
              Open one client to see their property enquiries, communication
              channels, follow-ups and next action without mixing separate
              property conversations.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              {
                label: "Clients",
                value: clients.length,
                icon: Users,
                colour: "text-blue-600",
              },
              {
                label: "Interests",
                value: activeRelationships,
                icon: Building2,
                colour: "text-emerald-600",
              },
              {
                label: "Hot",
                value: hotClients,
                icon: Sparkles,
                colour: "text-orange-600",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="min-w-24 rounded-2xl border border-white bg-white/80 p-3 shadow-sm backdrop-blur"
              >
                <metric.icon className={`h-4 w-4 ${metric.colour}`} />
                <div className="mt-2 text-2xl font-bold text-neutral-900">
                  {metric.value}
                </div>
                <div className="text-[11px] font-medium text-neutral-500">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white shadow-soft">
        <div className="border-b border-neutral-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search clients"
                placeholder="Search clients by name, email or phone"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <SlidersHorizontal className="hidden h-4 w-4 text-neutral-400 sm:block" />
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  aria-pressed={filter === option.id}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    filter === option.id
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-neutral-300" />
            <h2 className="mt-4 font-semibold text-neutral-900">
              No clients match this view
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Try a different search or filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="group grid gap-4 p-4 transition hover:bg-emerald-50/40 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,.7fr)_minmax(160px,.55fr)_auto] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 text-sm font-bold text-white shadow-sm">
                    {initials(client.full_name)}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/clients/${client.id}`}
                      prefetch={false}
                      className="truncate font-semibold text-neutral-900 hover:text-emerald-700"
                    >
                      {client.full_name || "Unnamed client"}
                    </Link>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                      {client.email && (
                        <span className="flex min-w-0 items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{client.email}</span>
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-neutral-800">
                      {client.property_enquiries.length}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {client.property_enquiries.length === 1
                        ? "property interest"
                        : "property interests"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs capitalize text-neutral-500">
                    {client.stage?.replaceAll("_", " ") || "New enquiry"}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 lg:block">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                      client.priority === "hot"
                        ? "bg-orange-100 text-orange-700"
                        : client.priority === "warm"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {client.priority || "normal"}
                  </span>
                  <p className="text-xs text-neutral-500 lg:mt-2">
                    Active{" "}
                    {relativeActivity(
                      client.last_activity_at,
                      client.created_at,
                      generatedAt,
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1">
                  {client.phone && (
                    <>
                      <a
                        href={`tel:${client.phone}`}
                        className="rounded-xl p-2 text-neutral-400 transition hover:bg-white hover:text-emerald-600 hover:shadow-sm"
                        aria-label={`Call ${client.full_name || "client"}`}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`sms:${client.phone}`}
                        className="rounded-xl p-2 text-neutral-400 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
                        aria-label={`Message ${client.full_name || "client"}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </>
                  )}
                  <Link
                    href={`/clients/${client.id}`}
                    prefetch={false}
                    className="ml-1 inline-flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Open 360
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
