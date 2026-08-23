"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CreditCard,
  Gauge,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
  Unplug,
  type LucideIcon,
} from "lucide-react";

interface DashboardData {
  subscription: {
    status?: string | null;
    plans?: {
      name?: string | null;
      included_credits?: number | null;
    } | null;
  } | null;
  balance: {
    credits_included?: number | null;
    credits_bonus?: number | null;
    credits_used?: number | null;
  } | null;
  metrics: {
    totalRequests?: number;
    failedRequests?: number;
    blockedRequests?: number;
    totalCredits?: number;
    totalCostAud?: number;
    monthlyErrorRate?: number | null;
    recentWindowDays?: number;
    recentRequests?: number;
    recentFailedRequests?: number;
    recentAverageLatencyMs?: number | null;
    recentErrorRate?: number | null;
    lastFailureAt?: string | null;
  };
  usageByFeature: Array<{
    feature: string;
    requests: number;
    credits: number;
    costMicros: number;
    failures: number;
  }>;
  integrations: {
    connected: number;
    total: number;
    items: Array<{
      provider: string;
      status: string;
      last_sync_at: string | null;
    }>;
  };
  incidents: Array<{
    id: string;
    severity: string;
    component: string;
    title: string;
    occurrence_count: number;
  }>;
  tickets: Array<{
    id: string;
    priority: string;
    category: string;
    subject: string;
    status: string;
  }>;
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

interface StatusRowProps {
  label: string;
  value: string;
  healthy: boolean | null;
}

interface ListPanelProps {
  icon: LucideIcon;
  title: string;
  items: Array<{ id: string; title: string; detail: string }>;
  empty: string;
}

const money = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export default function ControlCentrePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/control-centre", {
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardData & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Unable to load Control Centre");
      setData(payload);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to load Control Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            Loading Clippy Control Centre...
          </p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const plan = data?.subscription?.plans;
  const balance = data?.balance;
  const included =
    Number(balance?.credits_included || plan?.included_credits || 0) +
    Number(balance?.credits_bonus || 0);
  const used = Number(balance?.credits_used || metrics.totalCredits || 0);
  const usagePercent = included
    ? Math.min(Math.round((used / included) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Platform operations
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Clippy Control Centre
            </h1>
            <p className="mt-1 text-muted-foreground">
              Subscriptions, AI cost, access, reliability and support in one
              place.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}. Run the Control Centre SQL migration in Supabase if these
            tables have not been created yet.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CreditCard}
            label="Subscription"
            value={plan?.name || "Not configured"}
            detail={data?.subscription?.status || "Not linked"}
          />
          <MetricCard
            icon={Bot}
            label="AI requests this month"
            value={String(metrics.totalRequests || 0)}
            detail={`${metrics.failedRequests || 0} failed · ${metrics.blockedRequests || 0} blocked`}
          />
          <MetricCard
            icon={Gauge}
            label="AI provider cost"
            value={money.format(metrics.totalCostAud || 0)}
            detail={
              metrics.recentAverageLatencyMs == null
                ? `No successful AI samples in ${metrics.recentWindowDays || 7} days`
                : `${metrics.recentAverageLatencyMs} ms successful latency · ${metrics.recentWindowDays || 7} days`
            }
          />
          <MetricCard
            icon={ShieldCheck}
            label="Connected integrations"
            value={`${data?.integrations?.connected || 0}/${data?.integrations?.total || 0}`}
            detail={`${data?.incidents?.length || 0} open incidents`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border bg-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Monthly AI allowance</h2>
                <p className="text-sm text-muted-foreground">
                  Customer-friendly credits with exact provider cost tracked
                  behind the scenes.
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                {usagePercent}% used
              </span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span>{used.toLocaleString("en-AU")} credits used</span>
              <span>
                {included
                  ? `${included.toLocaleString("en-AU")} included`
                  : "Allowance not initialised"}
              </span>
            </div>
            {usagePercent >= 85 && (
              <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Usage is high. Preserve lead replies and pause non-essential
                bulk generation before the allowance is exhausted.
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Reliability</h2>
            </div>
            <div className="mt-5 space-y-4">
              <StatusRow
                label={`AI error rate (${metrics.recentWindowDays || 7} days)`}
                value={
                  metrics.recentErrorRate == null
                    ? "No samples"
                    : `${metrics.recentErrorRate}% · ${metrics.recentRequests || 0} req`
                }
                healthy={
                  metrics.recentErrorRate == null
                    ? null
                    : metrics.recentErrorRate < 5
                }
              />
              <StatusRow
                label="Open incidents"
                value={String(data?.incidents?.length || 0)}
                healthy={!data?.incidents?.length}
              />
              <StatusRow
                label="Open support tickets"
                value={String(
                  (data?.tickets || []).filter(
                    (ticket) => ticket.status !== "resolved",
                  ).length,
                )}
                healthy={
                  (data?.tickets || []).filter(
                    (ticket) => ticket.status !== "resolved",
                  ).length < 3
                }
              />
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Usage by feature</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-3">
                      Feature
                    </th>
                    <th scope="col" className="pb-3">
                      Requests
                    </th>
                    <th scope="col" className="pb-3">
                      Credits
                    </th>
                    <th scope="col" className="pb-3">
                      Cost
                    </th>
                    <th scope="col" className="pb-3">
                      Failures
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.usageByFeature || []).map((item) => (
                    <tr key={item.feature} className="border-t">
                      <td className="py-3 font-medium">
                        {String(item.feature).replaceAll("_", " ")}
                      </td>
                      <td>{item.requests}</td>
                      <td>{item.credits}</td>
                      <td>
                        {money.format(Number(item.costMicros || 0) / 1_000_000)}
                      </td>
                      <td>{item.failures}</td>
                    </tr>
                  ))}
                  {!data?.usageByFeature?.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No metered AI usage yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <Unplug className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Integration health</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(data?.integrations?.items || []).map((item) => (
                <div
                  key={item.provider}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div>
                    <p className="font-medium capitalize">{item.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.last_sync_at
                        ? `Last sync ${new Date(item.last_sync_at).toLocaleString("en-AU")}`
                        : "Never synced"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${["connected", "healthy"].includes(item.status) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {item.status || "unknown"}
                  </span>
                </div>
              ))}
              {!data?.integrations?.items?.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No integrations registered.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ListPanel
            icon={AlertTriangle}
            title="Open incidents"
            empty="No open incidents"
            items={(data?.incidents || []).map((incident) => ({
              id: incident.id,
              title: incident.title,
              detail: `${incident.severity.toUpperCase()} · ${incident.component} · ${incident.occurrence_count} occurrence(s)`,
            }))}
          />
          <ListPanel
            icon={LifeBuoy}
            title="Support queue"
            empty="No support tickets"
            items={(data?.tickets || []).map((ticket) => ({
              id: ticket.id,
              title: ticket.subject,
              detail: `${ticket.priority.toUpperCase()} · ${ticket.category} · ${ticket.status}`,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusRow({ label, value, healthy }: StatusRowProps) {
  const tone =
    healthy === null
      ? "bg-muted text-muted-foreground"
      : healthy
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-800";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
      >
        {value}
      </span>
    </div>
  );
}

function ListPanel({ icon: Icon, title, items, empty }: ListPanelProps) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border p-3">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
        {!items.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
