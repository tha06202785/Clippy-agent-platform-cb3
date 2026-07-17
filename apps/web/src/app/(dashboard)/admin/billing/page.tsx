"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { DollarSign, CreditCard, CheckCircle, AlertCircle, Download, ExternalLink, Loader2 } from "lucide-react";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
}

interface Invoice {
  id: string;
  created: number;
  hosted_invoice_url: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  lines: { data: { description: string }[] };
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  solo: "Solo",
  professional: "Professional",
  team: "Team",
  enterprise: "Enterprise",
  past_due: "Past Due",
};

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription/current").then((r) => r.json()),
      fetch("/api/subscription/plans").then((r) => r.json()),
    ])
      .then(([subData, plansData]) => {
        if (subData.subscription) setSubscription(subData.subscription);
        if (plansData.invoices) setInvoices(plansData.invoices);
      })
      .catch(() => setError("Failed to load billing data"))
      .finally(() => setLoading(false));
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal");
      }
    } catch {
      setError("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const planLabel = subscription?.plan
    ? PLAN_LABELS[subscription.plan] || subscription.plan
    : "Free";

  const isPaid =
    subscription?.status === "active" || subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";

  const nextPayment = subscription?.current_period_end
    ? formatDate(parseInt(subscription.current_period_end))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your subscription and invoices
          </p>
        </div>
        <button
          onClick={handleManageSubscription}
          disabled={portalLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {portalLoading ? "Loading..." : "Manage subscription"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Current Plan */}
        <div className="rounded-xl border border-border bg-card p-5">
          <CreditCard className="w-5 h-5 text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Current plan</p>
          <p
            className={`text-lg font-bold mt-1 ${
              isPastDue ? "text-red-600" : "text-foreground"
            }`}
          >
            {loading ? "—" : planLabel}
          </p>
          {nextPayment && isPaid && (
            <p className="text-sm text-muted-foreground">
              Renews {nextPayment}
            </p>
          )}
          {isPastDue && (
            <p className="text-sm text-red-600 mt-1">
              Payment failed — update to restore access
            </p>
          )}
        </div>

        {/* Monthly spend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <DollarSign className="w-5 h-5 text-emerald-500 mb-3" />
          <p className="text-xs text-muted-foreground">Monthly spend</p>
          <p className="text-lg font-bold text-foreground mt-1">
            {loading ? "—" : isPaid ? "Active" : "Free"}
          </p>
          {!isPaid && (
            <p className="text-sm text-muted-foreground">No charges</p>
          )}
        </div>

        {/* Payment status */}
        <div className="rounded-xl border border-border bg-card p-5">
          {isPaid ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 mb-3" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 mb-3" />
          )}
          <p className="text-xs text-muted-foreground">Payment status</p>
          <p
            className={`text-lg font-bold mt-1 ${
              isPaid ? "text-emerald-600" : isPastDue ? "text-red-600" : "text-amber-600"
            }`}
          >
            {loading
              ? "—"
              : isPaid
              ? "Current"
              : isPastDue
              ? "Past due"
              : "No plan"}
          </p>
          {nextPayment && isPaid && (
            <p className="text-sm text-muted-foreground">
              Next payment {nextPayment}
            </p>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Invoice history</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No invoices yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Invoice
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const desc =
                  inv.lines?.data?.[0]?.description ||
                  inv.lines?.data?.[1]?.description ||
                  "Clippy subscription";
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 text-sm font-medium text-foreground">
                      {inv.id}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(inv.created)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground truncate max-w-xs">
                      {desc}
                    </td>
                    <td className="p-4 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(inv.amount_paid, inv.currency)}
                    </td>
                    <td className="p-4 text-center">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> {inv.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
