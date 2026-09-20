import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "../..");

describe("Stripe billing identity pipeline", () => {
  it("keeps billing identity and webhook audit data server-only", () => {
    const migration = readFileSync(
      resolve(
        repositoryRoot,
        "supabase/migrations/20260901030000_harden_stripe_billing_identity.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "alter table public.stripe_webhook_events enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.org_subscriptions from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.billing_audit_events from anon, authenticated",
    );
    expect(migration).toContain("billing_identity_status = case");
    expect(migration).toContain("else 'requires_review'");
  });

  it("requires contact ownership metadata and idempotent webhook claims", () => {
    const checkout = readFileSync(
      resolve(repositoryRoot, "apps/web/src/app/api/stripe/checkout/route.ts"),
      "utf8",
    );
    const webhook = readFileSync(
      resolve(repositoryRoot, "apps/web/src/app/api/webhooks/stripe/route.ts"),
      "utf8",
    );

    expect(checkout).toContain("context.isPlatformAdmin");
    expect(checkout).toContain("billing_contact_user_id");
    expect(checkout).toContain("phone_number_collection: { enabled: true }");
    expect(checkout).toContain("stripeCustomerMatchesBillingContact");
    expect(webhook).toContain('inserted.error?.code !== "23505"');
    expect(webhook).toContain("hasCurrentBillingOwner");
    expect(webhook).toContain('billing_identity_status: "verified"');
    expect(webhook).toContain("stripeEventMatchesConfiguredMode");
    expect(webhook).toContain('session.status !== "complete"');
    expect(webhook).toContain('["paid", "no_payment_required"]');
  });

  it("shows payment verification without blocking unverified accounts on invoices", () => {
    const billingPage = readFileSync(
      resolve(
        repositoryRoot,
        "apps/web/src/app/(dashboard)/admin/billing/page.tsx",
      ),
      "utf8",
    );

    expect(billingPage).toContain("Payment received. Clippy is verifying");
    expect(billingPage).toContain("if (billingVerified)");
    expect(billingPage).toContain("attempt < 5");
  });
});
