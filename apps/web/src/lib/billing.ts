import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const PAID_PLAN_IDS = ["starter", "professional", "agency"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

const PLAN_NAMES: Record<PaidPlanId, string> = {
  starter: "Founding Agent",
  professional: "Professional",
  agency: "Founding Team",
};

const PUBLIC_PLAN_DETAILS: Partial<
  Record<
    PaidPlanId,
    { monthlyPriceCents: number; audience: string; seats: number }
  >
> = {
  starter: {
    monthlyPriceCents: 9_900,
    audience: "Individual Australian real estate agents",
    seats: 1,
  },
  agency: {
    monthlyPriceCents: 39_900,
    audience: "Small agency teams joining through assisted onboarding",
    seats: 5,
  },
};

type BillingEnvironment = Record<string, string | undefined>;

export type StripeMode = "test" | "live" | "unknown";

export type BillingConfigurationStatus = {
  checkoutEnabled: boolean;
  mode: StripeMode;
  issues: string[];
};

export type BillingAccount = {
  orgId: string;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingContactUserId: string | null;
  billingContactEmail: string | null;
  billingContactName: string | null;
  billingContactPhoneLast4: string | null;
  billingIdentityStatus:
    "unverified" | "pending" | "verified" | "requires_review";
  billingIdentityVerifiedAt: string | null;
};

export type BillingContact = {
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
};

export function normaliseBillingEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length >= 3 && email.length <= 320 && email.includes("@")
    ? email
    : null;
}

export function getBillingContactFromUser(user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
}): BillingContact | null {
  const email = normaliseBillingEmail(user.email);
  if (!user.id || !email) return null;

  const rawName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name;
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim().slice(0, 200)
      : null;
  const phone =
    typeof user.phone === "string" && user.phone.trim()
      ? user.phone.trim()
      : null;

  return { userId: user.id, email, name, phone };
}

export function getPhoneLast4(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function maskBillingEmail(value: unknown): string | null {
  const email = normaliseBillingEmail(value);
  if (!email) return null;
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > 2 ? "***" : "*"}@${domain}`;
}

export function stripeCustomerMatchesBillingContact(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
  input: { orgId: string; contact: BillingContact },
): customer is Stripe.Customer {
  if (customer.deleted) return false;
  return (
    normaliseBillingEmail(customer.email) === input.contact.email &&
    customer.metadata?.org_id === input.orgId &&
    customer.metadata?.billing_contact_user_id === input.contact.userId
  );
}

export function checkoutEmailMatchesBillingContact(
  checkoutEmail: unknown,
  billingEmail: string | null,
): boolean {
  return (
    normaliseBillingEmail(checkoutEmail) !== null &&
    normaliseBillingEmail(checkoutEmail) === normaliseBillingEmail(billingEmail)
  );
}

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return (
    typeof value === "string" && PAID_PLAN_IDS.includes(value as PaidPlanId)
  );
}

export function getPlanPriceId(
  plan: PaidPlanId,
  env: BillingEnvironment = process.env,
): string | null {
  const priceIds: Record<PaidPlanId, string | undefined> = {
    starter: env.STRIPE_STARTER_PRICE_ID,
    professional: env.STRIPE_PROFESSIONAL_PRICE_ID,
    agency: env.STRIPE_AGENCY_PRICE_ID,
  };

  const priceId = priceIds[plan]?.trim();
  if (!priceId || !/^price_[A-Za-z0-9]+$/.test(priceId)) return null;
  if (
    ["price_starter", "price_professional", "price_agency"].includes(priceId)
  ) {
    return null;
  }
  return priceId;
}

export function getStripeMode(secretKey: unknown): StripeMode {
  if (typeof secretKey !== "string") return "unknown";
  const value = secretKey.trim();
  if (/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(value)) return "live";
  if (/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(value)) return "test";
  return "unknown";
}

function hasConfiguredWebhookSecret(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^whsec_[A-Za-z0-9]+$/.test(value.trim()) &&
    value.trim() !== "whsec_example"
  );
}

function hasConfiguredSupabaseUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function hasConfiguredServiceRole(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim().length >= 32 &&
    !value.toLowerCase().includes("service_role_example") &&
    !value.toLowerCase().includes("your_supabase")
  );
}

export function getBillingConfigurationStatus(
  env: BillingEnvironment = process.env,
): BillingConfigurationStatus {
  const issues: string[] = [];
  const mode = getStripeMode(env.STRIPE_SECRET_KEY);

  if (env.ENABLE_PAID_CHECKOUT !== "true") {
    issues.push("Paid checkout is disabled");
  }
  if (mode === "unknown") {
    issues.push("Stripe secret key is missing or invalid");
  }
  if (env.VERCEL_ENV === "production" && mode !== "live") {
    issues.push("Production requires a live-mode Stripe key");
  }
  if (!hasConfiguredWebhookSecret(env.STRIPE_WEBHOOK_SECRET)) {
    issues.push("Stripe webhook signing secret is missing or invalid");
  }
  if (!getPlanPriceId("starter", env)) {
    issues.push("Founding Agent Stripe price is missing or invalid");
  }
  if (!hasConfiguredSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
    issues.push("Supabase URL is missing or invalid");
  }
  if (!hasConfiguredServiceRole(env.SUPABASE_SERVICE_ROLE_KEY)) {
    issues.push("Supabase service-role credential is missing or invalid");
  }

  return { checkoutEnabled: issues.length === 0, mode, issues };
}

export function isPaidCheckoutEnabled(
  env: BillingEnvironment = process.env,
): boolean {
  return getBillingConfigurationStatus(env).checkoutEnabled;
}

export function getPlanForPriceId(
  priceId: string,
  env: BillingEnvironment = process.env,
): PaidPlanId | null {
  return (
    PAID_PLAN_IDS.find((plan) => getPlanPriceId(plan, env) === priceId) || null
  );
}

export function getPublicBillingCatalog(env: BillingEnvironment = process.env) {
  const checkoutEnabled = isPaidCheckoutEnabled(env);

  return {
    pricingStatus: checkoutEnabled
      ? ("checkout_ready" as const)
      : ("assisted_checkout" as const),
    currency: "AUD",
    checkoutEnabled,
    plans: (["starter", "agency"] as const).map((id) => ({
      id,
      name: PLAN_NAMES[id],
      ...PUBLIC_PLAN_DETAILS[id],
      checkoutAvailable: checkoutEnabled && Boolean(getPlanPriceId(id, env)),
    })),
  };
}

export function getAppUrl(env: BillingEnvironment = process.env): string {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return "https://useclippy.com";

  try {
    const url = new URL(configured);
    const localDevelopment =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    if (url.protocol !== "https:" && !localDevelopment) {
      return "https://useclippy.com";
    }

    return url.origin;
  } catch {
    return "https://useclippy.com";
  }
}

export function getStripeClient(
  env: BillingEnvironment = process.env,
): Stripe | null {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const mode = getStripeMode(secretKey);
  if (!secretKey || mode === "unknown") return null;
  if (env.VERCEL_ENV === "production" && mode !== "live") return null;

  return new Stripe(secretKey, {
    apiVersion: "2024-04-10",
  });
}

export function stripeEventMatchesConfiguredMode(
  eventLivemode: boolean,
  env: BillingEnvironment = process.env,
): boolean {
  const mode = getStripeMode(env.STRIPE_SECRET_KEY);
  return mode !== "unknown" && eventLivemode === (mode === "live");
}

export function getBillingDataClient(fallback: SupabaseClient): SupabaseClient {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return createAdminClient();
  }
  return fallback;
}

function unixSecondsToIso(value: unknown): string | null {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

export async function getBillingAccount(
  supabase: SupabaseClient,
  orgId: string,
): Promise<BillingAccount | null> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("org_subscriptions")
    .select(
      "status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, billing_contact_user_id, billing_contact_email, billing_contact_name, billing_contact_phone_last4, billing_identity_status, billing_identity_verified_at, plans(key)",
    )
    .eq("org_id", orgId)
    .maybeSingle();

  if (!subscriptionError && subscription) {
    const relatedPlan = Array.isArray(subscription.plans)
      ? subscription.plans[0]
      : subscription.plans;

    return {
      orgId,
      plan: relatedPlan?.key || "starter",
      status: subscription.status || "inactive",
      stripeCustomerId: subscription.stripe_customer_id || null,
      stripeSubscriptionId: subscription.stripe_subscription_id || null,
      currentPeriodEnd: subscription.current_period_end || null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      billingContactUserId: subscription.billing_contact_user_id || null,
      billingContactEmail: subscription.billing_contact_email || null,
      billingContactName: subscription.billing_contact_name || null,
      billingContactPhoneLast4:
        subscription.billing_contact_phone_last4 || null,
      billingIdentityStatus:
        subscription.billing_identity_status || "unverified",
      billingIdentityVerifiedAt:
        subscription.billing_identity_verified_at || null,
    };
  }

  // Compatibility for installations that have not applied the Control Centre
  // migration yet. Selecting the row avoids coupling this fallback to plan vs
  // plan_id naming across older migrations.
  const { data: legacyOrg, error: legacyError } = await supabase
    .from("orgs")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (legacyError) {
    throw new Error("Unable to load the organisation billing account");
  }
  if (!legacyOrg) return null;

  return {
    orgId,
    plan: legacyOrg.plan || legacyOrg.plan_id || "free",
    status: legacyOrg.stripe_subscription_id ? "active" : "inactive",
    stripeCustomerId: legacyOrg.stripe_customer_id || null,
    stripeSubscriptionId: legacyOrg.stripe_subscription_id || null,
    currentPeriodEnd: unixSecondsToIso(legacyOrg.current_period_end),
    cancelAtPeriodEnd: Boolean(legacyOrg.cancel_at_period_end),
    billingContactUserId: null,
    billingContactEmail: null,
    billingContactName: null,
    billingContactPhoneLast4: null,
    billingIdentityStatus: "unverified",
    billingIdentityVerifiedAt: null,
  };
}

type CheckoutIdentityInput = {
  clientReferenceId?: string | null;
  metadata?: Record<string, string | undefined> | null;
  customerId?: string | null;
  subscriptionId?: string | null;
};

export function getVerifiedCheckoutIdentity(input: CheckoutIdentityInput) {
  const orgId = input.clientReferenceId;
  const metadataOrgId = input.metadata?.org_id;
  const plan = input.metadata?.plan;
  const userId = input.metadata?.user_id;
  const billingContactUserId = input.metadata?.billing_contact_user_id;

  if (
    !orgId ||
    orgId !== metadataOrgId ||
    !isPaidPlan(plan) ||
    !userId ||
    userId !== billingContactUserId ||
    !input.customerId ||
    !input.subscriptionId
  ) {
    return null;
  }

  return {
    orgId,
    plan,
    userId,
    customerId: input.customerId,
    subscriptionId: input.subscriptionId,
  };
}
