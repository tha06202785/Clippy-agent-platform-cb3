"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Clock,
  Star,
  Home,
  Calendar,
  ChevronRight,
  Phone,
  MessageCircle,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
} from "lucide-react";

interface BriefingStats {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  activeListings: number;
  pipelineValue: string;
  daysOnMarket: number;
  closedThisMonth: number;
  closedValue: string;
}

interface BriefingLead {
  id: string;
  full_name: string;
  ai_score: number;
  stage: string;
  source: string;
  created_at: string;
  phone?: string | null;
}

interface BriefingListing {
  id: string;
  address: string;
  price: string;
  status: string;
  daysOnMarket: number;
  created_at: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)
    return { text: "Good evening", icon: Moon, color: "text-indigo-500" };
  if (h < 12)
    return { text: "Good morning", icon: Sun, color: "text-amber-500" };
  if (h < 18)
    return { text: "Good afternoon", icon: CloudSun, color: "text-orange-500" };
  return { text: "Good evening", icon: Moon, color: "text-indigo-500" };
}

function formatCurrency(val: string | number) {
  const n =
    typeof val === "string" ? parseFloat(val.replace(/[^0-9.]/g, "")) : val;
  if (isNaN(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function daysAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function urgencyLabel(score: number, daysSince: number) {
  if (score >= 75 && daysSince > 2)
    return { label: "Call today", color: "text-red-600 bg-red-50" };
  if (score >= 50 && daysSince > 5)
    return { label: "Follow up", color: "text-amber-600 bg-amber-50" };
  return null;
}

export function MorningBriefing() {
  const [stats, setStats] = useState<BriefingStats | null>(null);
  const [hotLeads, setHotLeads] = useState<BriefingLead[]>([]);
  const [listings, setListings] = useState<BriefingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { text: greeting, icon: GreetingIcon, color } = getGreeting();
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/leads")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/listings")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([statsData, leadsData, listingsData]) => {
        const leads: BriefingLead[] = Array.isArray(leadsData) ? leadsData : [];
        const listings: BriefingListing[] = Array.isArray(listingsData)
          ? listingsData
          : [];

        const hot = leads
          .filter((l) => (l.ai_score || 0) >= 60)
          .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
          .slice(0, 5);

        const closedValue = listings
          .filter((l) => l.status === "sold")
          .reduce(
            (sum, l) =>
              sum + parseFloat((l.price || "0").replace(/[^0-9.]/g, "")),
            0,
          );

        setStats({
          totalLeads: leads.length,
          newLeads: leads.filter(
            (l) => l.stage === "inquiry" || l.stage === "new",
          ).length,
          hotLeads: hot.length,
          activeListings: listings.filter((l) => l.status === "active").length,
          pipelineValue: "$0",
          daysOnMarket: 0,
          closedThisMonth: listings.filter((l) => l.status === "sold").length,
          closedValue: formatCurrency(closedValue),
        });
        setHotLeads(hot);
        setListings(
          listings
            .map((l) => ({
              ...l,
              daysOnMarket: daysAgo(l.created_at),
            }))
            .slice(0, 3),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className={"flex items-center gap-2 mb-1 " + color}>
            <GreetingIcon className="w-5 h-5" />
            <span className="text-sm font-semibold">{greeting}</span>
          </div>
          <p className="text-lg font-bold text-foreground">{today}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats?.totalLeads || 0} total leads · {stats?.hotLeads || 0} hot
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">AI Brief</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Star,
            label: "Hot leads",
            value: stats?.hotLeads || 0,
            sub: "Need action today",
            color: "text-red-500 bg-red-50",
          },
          {
            icon: TrendingUp,
            label: "New leads",
            value: stats?.newLeads || 0,
            sub: "This week",
            color: "text-blue-500 bg-blue-50",
          },
          {
            icon: Home,
            label: "Active listings",
            value: stats?.activeListings || 0,
            sub: "On market",
            color: "text-emerald-500 bg-emerald-50",
          },
          {
            icon: Calendar,
            label: "Closed this month",
            value: stats?.closedThisMonth || 0,
            sub: stats?.closedValue || "$0",
            color: "text-purple-500 bg-purple-50",
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div
                className={
                  "w-8 h-8 rounded-lg flex items-center justify-center " +
                  color.split(" ")[1]
                }
              >
                <Icon className={"w-4 h-4 " + color.split(" ")[0]} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Hot leads requiring action */}
      {hotLeads.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
            ⚡ Needs attention
          </p>
          <div className="space-y-2">
            {hotLeads.map((lead) => {
              const urg = urgencyLabel(
                lead.ai_score || 0,
                daysAgo(lead.created_at),
              );
              return (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs flex-shrink-0">
                      {(lead.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {lead.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Score {lead.ai_score} · {daysAgo(lead.created_at)}d
                        since inquiry · {lead.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {urg && (
                      <span
                        className={
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                          urg.color
                        }
                      >
                        {urg.label}
                      </span>
                    )}
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        aria-label={`Call ${lead.full_name}`}
                        className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Listings snapshot */}
      {listings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
            Properties on market
          </p>
          <div className="space-y-2">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {listing.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {listing.price || "Price TBC"} · {listing.daysOnMarket}d on
                    market
                  </p>
                </div>
                <span
                  className={
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                    (listing.daysOnMarket > 60
                      ? "bg-red-100 text-red-700"
                      : listing.daysOnMarket > 30
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700")
                  }
                >
                  {listing.daysOnMarket > 60
                    ? "Stale"
                    : listing.daysOnMarket > 30
                      ? "Aging"
                      : "Fresh"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats?.totalLeads === 0 && (
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No data yet. Add your first lead to get your briefing.
          </p>
        </div>
      )}

      {/* Footer CTA */}
      <a
        href="/inbox"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Open inbox <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  );
}
