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
  const router = useRouter();
  const [user, setUser] = useState<UserContext | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const identityResponse = await fetch("/api/me", { cache: "no-store", credentials: "include" });

        if (identityResponse.status === 401) {
          router.replace("/sign-in?next=%2Fdashboard");
          return;
        }

        const identity = await identityResponse.json();
        if (!identityResponse.ok) throw new Error(identity.error || "Unable to load your profile");

        const dashboardResponse = await fetch("/api/principal/dashboard", {
          cache: "no-store",
          credentials: "include",
        });
        const dashboard = dashboardResponse.ok ? await dashboardResponse.json() : {};

        if (!active) return;
        setUser(identity as UserContext);
        setStats(dashboard as DashboardStats);
      } catch (reason: unknown) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load dashboard");
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

  const replies = stats.repliesToday ?? stats.conversations?.today ?? 0;
  const inspections = stats.inspections?.today ?? 0;
  const hotLeads = stats.hotLeads?.length ?? 0;
  const responseTime = stats.responseTime ?? 0;

  const cards = [
    { label: "Replies today", value: replies, icon: MessageCircle },
    { label: "Inspections booked", value: inspections, icon: Calendar },
    { label: "Hot leads", value: hotLeads, icon: Users },
    { label: "Average response", value: `${responseTime}s`, icon: Clock },
  ];

  const recommendations = [
    hotLeads > 0
      ? {
          title: `Follow up ${hotLeads} hot ${hotLeads === 1 ? "lead" : "leads"}`,
          detail: "These leads are showing the strongest buying or selling intent.",
          action: "Open inbox",
          href: "/inbox",
        }
      : {
          title: "Review new enquiries",
          detail: "Check the inbox for conversations that may need qualification.",
          action: "Open inbox",
          href: "/inbox",
        },
    inspections > 0
      ? {
          title: `Prepare for ${inspections} ${inspections === 1 ? "inspection" : "inspections"}`,
          detail: "Confirm attendance and let Clippy send timely reminders.",
          action: "View deals",
          href: "/deals",
        }
      : {
          title: "Create an inspection opportunity",
          detail: "Ask Clippy to identify engaged leads who may be ready to book.",
          action: "Ask Clippy",
          href: "/copilot",
        },
    {
      title: responseTime > 60 ? "Improve response speed" : "Keep response momentum",
      detail:
        responseTime > 60
          ? `Your average response is ${responseTime} seconds. Let Clippy draft and prioritise replies.`
          : "Your response time is healthy. Keep Clippy active so no lead waits too long.",
      action: "Open Copilot",
      href: "/copilot",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6 pb-32 md:pb-6">
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
      <div className="p-6 pb-32 md:pb-6">
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
    <div className="space-y-6 bg-neutral-50 p-4 pb-32 sm:p-6 md:pb-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-5 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-md">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">{greeting}, {user?.name ?? "Agent"}</h1>
            <p className="mt-1 text-neutral-600">{user?.agencyName ? `${user.agencyName} · ${user.role}` : user?.role}</p>
            <p className="mt-3 text-sm text-neutral-500">
              {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Clippy recommends</p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">Your next best actions</h2>
            <p className="mt-1 text-sm text-neutral-500">Prioritised from your live dashboard activity.</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3"><Zap className="h-5 w-5 text-emerald-600" /></div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {recommendations.map((item, index) => (
            <article key={item.title} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{index + 1}</div>
              <h3 className="mt-3 font-semibold text-neutral-900">{item.title}</h3>
              <p className="mt-1 min-h-10 text-sm text-neutral-600">{item.detail}</p>
              <a href={item.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                {item.action}<ArrowRight className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-neutral-500 md:text-sm">{label}</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
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
            <h2 className="font-semibold text-neutral-900">What Clippy has done</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /><span className="text-sm text-neutral-700">Handled or tracked <strong>{replies}</strong> replies today.</span></div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><Calendar className="h-4 w-4 shrink-0 text-emerald-600" /><span className="text-sm text-neutral-700">Recorded <strong>{inspections}</strong> inspection bookings.</span></div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" /><span className="text-sm text-neutral-700">Identified <strong>{hotLeads}</strong> high-priority leads.</span></div>
            <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3"><Zap className="h-4 w-4 shrink-0 text-emerald-600" /><span className="text-sm text-neutral-700">Estimated time saved: <strong>{stats.timeSaved ?? 0} hours</strong>.</span></div>
          </div>
        </article>

        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-neutral-900">Business opportunity</h2>
          <p className="mt-3 text-3xl font-bold text-emerald-700">${(stats.pipelineValue ?? 0).toLocaleString("en-AU")}</p>
          <p className="mt-1 text-sm text-neutral-600">Current pipeline value</p>
          <p className="mt-3 text-sm text-neutral-700">Potential commission: <strong>${(stats.commissionGenerated ?? 0).toLocaleString("en-AU")}</strong></p>
          <a href="/copilot" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Ask Clippy what to do next<ArrowRight className="h-4 w-4" />
          </a>
        </article>
      </section>
    </div>
  );
}
