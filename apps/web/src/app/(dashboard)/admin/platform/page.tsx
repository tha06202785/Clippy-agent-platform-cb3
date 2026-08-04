"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  CreditCard,
  DollarSign,
  Plug,
  RefreshCw,
  Users,
} from "lucide-react";

const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export default function PlatformAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/platform", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load platform overview");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load platform overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="grid min-h-[45vh] place-items-center text-center">
        <div>
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading Clippy platform data…</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Clippy owner backend</p>
          <h1 className="mt-1 text-2xl font-bold">Platform Command Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers, subscriptions, AI costs, integrations and operational work in one place.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {data?.warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Some monitoring sources are unavailable</p>
          <ul className="mt-2 list-disc pl-5">
            {data.warnings.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Building2} label="Customer agencies" value={metrics.organisations || 0} detail={`${metrics.users || 0} users`} />
        <Metric icon={CreditCard} label="Active subscriptions" value={metrics.activeSubscriptions || 0} detail={`${metrics.pastDueSubscriptions || 0} past due`} />
        <Metric icon={DollarSign} label="Monthly recurring revenue" value={aud.format(metrics.mrrAud || 0)} detail="From active Clippy plans" />
        <Metric icon={Bot} label="AI cost this month" value={aud.format(metrics.aiCostAud || 0)} detail={`${metrics.aiRequestsThisMonth || 0} requests · ${metrics.failedAIRequests || 0} failed · ${metrics.complianceInterventions || 0} withheld`} />
        <Metric icon={Plug} label="Integration health" value={`${Math.max((metrics.integrations || 0) - (metrics.unhealthyIntegrations || 0), 0)}/${metrics.integrations || 0}`} detail={`${metrics.unhealthyIntegrations || 0} need attention`} />
        <Metric icon={Activity} label="Queued communications" value={metrics.queuedCommunications || 0} detail={`${metrics.failedCommunications || 0} failed`} />
        <Metric icon={AlertTriangle} label="Open incidents" value={metrics.openIncidents || 0} detail="Across the Clippy platform" />
        <Metric icon={Users} label="Platform users" value={metrics.users || 0} detail="Unique agency memberships" />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Customers and subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Read-only operational view. Billing changes remain in Stripe.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-4">Agency</th>
                <th className="p-4">Users</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Subscription</th>
                <th className="p-4">Integrations</th>
                <th className="p-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data?.customers || []).map((customer: any) => (
                <tr key={customer.id} className="border-t">
                  <td className="p-4">
                    <p className="font-medium">{customer.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{customer.id}</p>
                  </td>
                  <td className="p-4">{customer.members}</td>
                  <td className="p-4">{customer.plan}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      ["active", "trialing"].includes(customer.subscriptionStatus)
                        ? "bg-emerald-100 text-emerald-800"
                        : customer.subscriptionStatus === "past_due"
                          ? "bg-red-100 text-red-800"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {customer.subscriptionStatus}
                    </span>
                    {!customer.stripeLinked && <p className="mt-1 text-xs text-amber-700">Stripe not linked</p>}
                  </td>
                  <td className="p-4">
                    {customer.integrations.total - customer.integrations.unhealthy}/{customer.integrations.total} healthy
                  </td>
                  <td className="p-4">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-AU") : "Unknown"}
                  </td>
                </tr>
              ))}
              {!data?.customers?.length && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No customer agencies found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <IssueList
          title="Integration attention"
          empty="All registered integrations are healthy."
          items={(data?.unhealthyIntegrations || []).map((item: any) => ({
            title: item.provider || "Unknown provider",
            detail: `${item.status || "unknown"} · agency ${item.org_id}`,
          }))}
        />
        <IssueList
          title="Failed communications"
          empty="No failed communications."
          items={(data?.failedCommunications || []).map((item: any) => ({
            title: item.status || "failed",
            detail: `Agency ${item.org_id} · ${item.scheduled_for ? new Date(item.scheduled_for).toLocaleString("en-AU") : "No schedule"}`,
          }))}
        />
        <IssueList
          title="Compliance interventions"
          empty="No Copilot responses withheld this month."
          items={(data?.complianceInterventions || []).map((item: any) => ({
            title: item.checks?.length
              ? item.checks.join(", ").replaceAll("_", " ")
              : "Compliance review",
            detail: `Agency ${item.orgId} · ${
              item.createdAt
                ? new Date(item.createdAt).toLocaleString("en-AU")
                : "Unknown time"
            }`,
          }))}
        />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: any) {
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

function IssueList({ title, items, empty }: any) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item: any, index: number) => (
          <div key={`${item.title}-${index}`} className="rounded-xl border p-3">
            <p className="font-medium capitalize">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
        {!items.length && <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}
