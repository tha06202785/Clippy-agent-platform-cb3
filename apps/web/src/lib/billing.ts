import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const PAID_PLAN_IDS = ["starter", "professional", "agency"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

const PLAN_NAMES: Record<PaidPlanId, string> = {
  starter: "Starter",
  professional: "Professional",
  agency: "Agency",
};

type BillingEnvironment = Record<string, string | undefined>;

export type BillingAccount = {
  orgId: string;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return (
    typeof value === "string" &&
    PAID_PLAN_IDS.includes(value as PaidPlanId)
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

  return priceIds[plan]?.trim() || null;
}

export function isPaidCheckoutEnabled(
  env: BillingEnvironment = process.env,
): boolean {
  return (
    env.ENABLE_PAID_CHECKOUT === "true" &&
    Boolean(env.STRIPE_SECRET_KEY?.trim()) &&
    Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()) &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
    PAID_PLAN_IDS.some((plan) => Boolean(getPlanPriceId(plan, env)))
  );
}

export function getPlanForPriceId(
  priceId: string,
  env: BillingEnvironment = process.env,
): PaidPlanId | null {
  return (
    PAID_PLAN_IDS.find((plan) => getPlanPriceId(plan, env) === priceId) || null
  );
}

export function getPublicBillingCatalog(
  env: BillingEnvironment = process.env,
) {
  const checkoutEnabled = isPaidCheckoutEnabled(env);

  return {
    pricingStatus: checkoutEnabled ? ("checkout_ready" as const) : ("pilot" as const),
    currency: "AUD",
    checkoutEnabled,
    plans: checkoutEnabled
      ? PAID_PLAN_IDS.filter((plan) => getPlanPriceId(plan, env)).map((id) => ({
          id,
          name: PLAN_NAMES[id],
          checkoutAvailable: true,
        }))
      : [],
  };
}

export function getAppUrl(
  env: BillingEnvironment = process.env,
): string {
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
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: "2024-04-10",
  });
}

export function getBillingDataClient(
  fallback: SupabaseClient,
): SupabaseClient {
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
      "status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, plans(key)",
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

  if (
    !orgId ||
    orgId !== metadataOrgId ||
    !isPaidPlan(plan) ||
    !input.customerId ||
    !input.subscriptionId
  ) {
    return null;
  }

  return {
    orgId,
    plan,
    userId: input.metadata?.user_id || null,
    customerId: input.customerId,
    subscriptionId: input.subscriptionId,
  };
}
