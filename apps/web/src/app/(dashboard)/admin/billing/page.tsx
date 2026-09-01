"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  billing_identity_status: string;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_contact_phone_last4: string | null;
}

interface Invoice {
  id: string;
  created: number;
  hosted_invoice_url: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  description: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Founding Agent",
  professional: "Professional",
  agency: "Founding Team",
  past_due: "Past Due",
};

function formatCurrency(amount: number, currency: string = "aud"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(value: number | string): string {
  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);

  return date.toLocaleDateString("en-AU", {
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
      fetch("/api/subscription/current"),
      fetch("/api/subscription/invoices"),
    ])
      .then(async ([subscriptionResponse, invoicesResponse]) => {
        const [subData, invoicesData] = await Promise.all([
          subscriptionResponse.json(),
          invoicesResponse.json(),
        ]);
        if (!subscriptionResponse.ok) {
          throw new Error(subData.error || "Failed to load subscription");
        }
        if (!invoicesResponse.ok) {
          throw new Error(invoicesData.error || "Failed to load invoices");
        }
        if (subData.subscription) setSubscription(subData.subscription);
        if (invoicesData.invoices) setInvoices(invoicesData.invoices);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load billing data",
        ),
      )
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
    ? formatDate(subscription.current_period_end)
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
        {isPaid || isPastDue ? (
          <button
            type="button"
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
        ) : null}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !isPaid && !isPastDue ? (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary">Founding 20</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            Activate Founding Agent for A$99/month
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Month-to-month with concierge setup and your founding price locked
            for 12 months. Only an organisation owner or admin can activate
            billing.
          </p>
          <CheckoutButton
            plan="starter"
            unauthenticatedPath="/sign-in?next=/admin/billing"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
          >
            Activate subscription
          </CheckoutButton>
        </section>
      ) : null}

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
              {subscription?.cancel_at_period_end ? "Ends" : "Renews"}{" "}
              {nextPayment}
            </p>
          )}
          {subscription?.billing_contact_email ? (
            <p className="text-sm text-muted-foreground mt-1">
              Billing contact: {subscription.billing_contact_name || "Agent"} (
              {subscription.billing_contact_email})
              {subscription.billing_contact_phone_last4
                ? ` • phone ending ${subscription.billing_contact_phone_last4}`
                : ""}
            </p>
          ) : null}
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
              isPaid
                ? "text-emerald-600"
                : isPastDue
                  ? "text-red-600"
                  : "text-amber-600"
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
          {subscription?.billing_identity_status === "requires_review" ? (
            <p className="text-sm text-red-600 mt-1">
              Billing identity needs support review
            </p>
          ) : subscription?.billing_identity_status === "pending" ? (
            <p className="text-sm text-amber-600 mt-1">
              Waiting for Stripe verification
            </p>
          ) : subscription?.billing_identity_status === "verified" ? (
            <p className="text-sm text-emerald-600 mt-1">
              Agent billing contact verified
            </p>
          ) : null}
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
                <th
                  scope="col"
                  className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Invoice
                </th>
                <th
                  scope="col"
                  className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="text-center p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="p-4" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const desc = inv.description || "Clippy subscription";
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
                          aria-label={`Open invoice from ${formatDate(inv.created)}`}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <ExternalLink
                            className="w-4 h-4 text-muted-foreground"
                            aria-hidden="true"
                          />
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
