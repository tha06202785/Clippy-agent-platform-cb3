"use client";

import * as Dialog from "@radix-ui/react-dialog";
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

type PlatformAction =
  | "suspend_account"
  | "resume_account"
  | "retry_communication"
  | "reset_integration";

type PendingPlatformAction = {
  action: PlatformAction;
  orgId: string;
  targetId?: string;
};

const platformActionDetails: Record<
  PlatformAction,
  {
    confirmation: string;
    title: string;
    description: string;
    submitLabel: string;
  }
> = {
  suspend_account: {
    confirmation: "SUSPEND",
    title: "Suspend agency",
    description:
      "Agency members will be blocked from Clippy until the account is resumed.",
    submitLabel: "Suspend agency",
  },
  resume_account: {
    confirmation: "RESUME",
    title: "Resume agency",
    description: "Agency members will regain access to Clippy.",
    submitLabel: "Resume agency",
  },
  retry_communication: {
    confirmation: "RETRY",
    title: "Retry communication",
    description:
      "The failed communication will be scheduled for another delivery attempt.",
    submitLabel: "Retry now",
  },
  reset_integration: {
    confirmation: "RESET",
    title: "Require integration reconnect",
    description:
      "Stored integration credentials will be cleared and the agency must reconnect.",
    submitLabel: "Require reconnect",
  },
};

const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export default function PlatformAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState("");
  const [pendingAction, setPendingAction] =
    useState<PendingPlatformAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionConfirmation, setActionConfirmation] = useState("");
  const [actionDialogError, setActionDialogError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/platform", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Unable to load platform overview");
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load platform overview",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openActionDialog = (
    action: PlatformAction,
    orgId: string,
    targetId?: string,
  ) => {
    setPendingAction({ action, orgId, targetId });
    setActionReason("");
    setActionConfirmation("");
    setActionDialogError("");
  };

  const closeActionDialog = () => {
    if (acting) return;
    setPendingAction(null);
    setActionReason("");
    setActionConfirmation("");
    setActionDialogError("");
  };

  const submitAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingAction) return;

    const details = platformActionDetails[pendingAction.action];
    const reason = actionReason.trim();
    if (reason.length < 8) {
      setActionDialogError("Provide a reason of at least 8 characters.");
      return;
    }
    if (actionConfirmation !== details.confirmation) {
      setActionDialogError(
        `Confirmation must exactly match ${details.confirmation}.`,
      );
      return;
    }

    const key = `${pendingAction.action}-${pendingAction.targetId || pendingAction.orgId}`;
    setActing(key);
    setError("");
    setActionDialogError("");
    try {
      const response = await fetch("/api/admin/platform/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction.action,
          orgId: pendingAction.orgId,
          targetId: pendingAction.targetId,
          reason,
          confirmation: actionConfirmation,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Platform action failed");
      await load();
      setPendingAction(null);
      setActionReason("");
      setActionConfirmation("");
    } catch (actionError) {
      setActionDialogError(
        actionError instanceof Error
          ? actionError.message
          : "Platform action failed",
      );
    } finally {
      setActing("");
    }
  };

  if (loading && !data) {
    return (
      <div className="grid min-h-[45vh] place-items-center text-center">
        <div>
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading Clippy platform data…
          </p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Clippy owner backend
          </p>
          <h1 className="mt-1 text-2xl font-bold">Platform Command Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers, subscriptions, AI costs, integrations and operational
            work in one place.
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {data?.warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            Some monitoring sources are unavailable
          </p>
          <ul className="mt-2 list-disc pl-5">
            {data.warnings.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Building2}
          label="Customer agencies"
          value={metrics.organisations || 0}
          detail={`${metrics.users || 0} users`}
        />
        <Metric
          icon={CreditCard}
          label="Active subscriptions"
          value={metrics.activeSubscriptions || 0}
          detail={`${metrics.pastDueSubscriptions || 0} past due`}
        />
        <Metric
          icon={DollarSign}
          label="Monthly recurring revenue"
          value={aud.format(metrics.mrrAud || 0)}
          detail="From active Clippy plans"
        />
        <Metric
          icon={Bot}
          label="AI cost this month"
          value={aud.format(metrics.aiCostAud || 0)}
          detail={`${metrics.aiRequestsThisMonth || 0} requests · ${metrics.failedAIRequests || 0} failed`}
        />
        <Metric
          icon={Plug}
          label="Integration health"
          value={`${Math.max((metrics.integrations || 0) - (metrics.unhealthyIntegrations || 0), 0)}/${metrics.integrations || 0}`}
          detail={`${metrics.unhealthyIntegrations || 0} need attention`}
        />
        <Metric
          icon={Activity}
          label="Queued communications"
          value={metrics.queuedCommunications || 0}
          detail={`${metrics.failedCommunications || 0} failed`}
        />
        <Metric
          icon={AlertTriangle}
          label="Open incidents"
          value={metrics.openIncidents || 0}
          detail="Across the Clippy platform"
        />
        <Metric
          icon={Users}
          label="Platform users"
          value={metrics.users || 0}
          detail="Unique agency memberships"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Customers and subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational changes require confirmation and are permanently
            audited. Billing changes remain in Stripe.
          </p>
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
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.customers || []).map((customer: any) => (
                <tr key={customer.id} className="border-t">
                  <td className="p-4">
                    <p className="font-medium">{customer.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {customer.id}
                    </p>
                  </td>
                  <td className="p-4">{customer.members}</td>
                  <td className="p-4">{customer.plan}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        customer.platformStatus === "suspended"
                          ? "bg-red-100 text-red-800"
                          : ["active", "trialing"].includes(
                                customer.subscriptionStatus,
                              )
                            ? "bg-emerald-100 text-emerald-800"
                            : customer.subscriptionStatus === "past_due"
                              ? "bg-red-100 text-red-800"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {customer.platformStatus === "suspended"
                        ? "suspended"
                        : customer.subscriptionStatus}
                    </span>
                    {!customer.stripeLinked && (
                      <p className="mt-1 text-xs text-amber-700">
                        Stripe not linked
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    {customer.integrations.total -
                      customer.integrations.unhealthy}
                    /{customer.integrations.total} healthy
                  </td>
                  <td className="p-4">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString("en-AU")
                      : "Unknown"}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {customer.stripeCustomerId && (
                        <a
                          className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          href={`https://dashboard.stripe.com/customers/${customer.stripeCustomerId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Stripe
                        </a>
                      )}
                      <button
                        className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        disabled={Boolean(acting)}
                        onClick={() =>
                          openActionDialog(
                            customer.platformStatus === "suspended"
                              ? "resume_account"
                              : "suspend_account",
                            customer.id,
                          )
                        }
                      >
                        {customer.platformStatus === "suspended"
                          ? "Resume"
                          : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.customers?.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-muted-foreground"
                  >
                    No customer agencies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <IssueList
          title="Integration attention"
          empty="All registered integrations are healthy."
          items={(data?.unhealthyIntegrations || []).map((item: any) => ({
            title: item.provider || "Unknown provider",
            detail: `${item.status || "unknown"} · agency ${item.org_id}`,
            actionLabel: "Require reconnect",
            onAction: () =>
              openActionDialog("reset_integration", item.org_id, item.id),
          }))}
        />
        <IssueList
          title="Failed communications"
          empty="No failed communications."
          items={(data?.failedCommunications || []).map((item: any) => ({
            title: item.status || "failed",
            detail: `Agency ${item.org_id} · ${item.last_error || (item.scheduled_for ? new Date(item.scheduled_for).toLocaleString("en-AU") : "No schedule")}`,
            actionLabel: "Retry now",
            onAction: () =>
              openActionDialog("retry_communication", item.org_id, item.id),
          }))}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Administrator audit trail</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanent record of platform-level customer actions.
          </p>
        </div>
        <div className="divide-y">
          {(data?.auditLog || []).map((entry: any) => (
            <div
              key={entry.id}
              className="grid gap-2 p-4 text-sm md:grid-cols-[180px_1fr_auto]"
            >
              <div>
                <p className="font-medium capitalize">
                  {entry.action.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("en-AU")}
                </p>
              </div>
              <div>
                <p>{entry.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actor_email || "Unknown administrator"} · agency{" "}
                  {entry.target_org_id || "deleted"}
                </p>
                {entry.error_message && (
                  <p className="mt-1 text-xs text-red-700">
                    {entry.error_message}
                  </p>
                )}
              </div>
              <span
                className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                  entry.outcome === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : entry.outcome === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {entry.outcome}
              </span>
            </div>
          ))}
          {!data?.auditLog?.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No administrator actions recorded yet.
            </p>
          )}
        </div>
      </section>

      <Dialog.Root
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) closeActionDialog();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-6 shadow-2xl">
            {pendingAction && (
              <>
                <Dialog.Title className="text-lg font-semibold">
                  {platformActionDetails[pendingAction.action].title}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  {platformActionDetails[pendingAction.action].description} This
                  action will be permanently audited.
                </Dialog.Description>

                <form className="mt-6 space-y-4" onSubmit={submitAction}>
                  <div>
                    <label
                      htmlFor="platform-action-reason"
                      className="text-sm font-medium"
                    >
                      Reason
                    </label>
                    <textarea
                      id="platform-action-reason"
                      className="mt-1.5 min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      placeholder="Minimum 8 characters"
                      disabled={Boolean(acting)}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="platform-action-confirmation"
                      className="text-sm font-medium"
                    >
                      Type{" "}
                      <span className="font-mono">
                        {
                          platformActionDetails[pendingAction.action]
                            .confirmation
                        }
                      </span>{" "}
                      to confirm
                    </label>
                    <input
                      id="platform-action-confirmation"
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      value={actionConfirmation}
                      onChange={(event) =>
                        setActionConfirmation(event.target.value)
                      }
                      disabled={Boolean(acting)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  {actionDialogError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {actionDialogError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      onClick={closeActionDialog}
                      disabled={Boolean(acting)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      disabled={Boolean(acting)}
                    >
                      {acting
                        ? "Applying…"
                        : platformActionDetails[pendingAction.action]
                            .submitLabel}
                    </button>
                  </div>
                </form>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium capitalize">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              {item.onAction && (
                <button
                  className="shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  onClick={item.onAction}
                >
                  {item.actionLabel}
                </button>
              )}
            </div>
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
