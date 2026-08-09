import { describe, expect, it } from "vitest";
import {
  getAppUrl,
  getPlanForPriceId,
  getVerifiedCheckoutIdentity,
  isPaidCheckoutEnabled,
  isPaidPlan,
} from "@/lib/billing";
import { checkoutSchema } from "@/lib/validation";

describe("billing trust boundaries", () => {
  it("accepts only plan keys backed by Control Centre entitlements", () => {
    expect(isPaidPlan("starter")).toBe(true);
    expect(isPaidPlan("professional")).toBe(true);
    expect(isPaidPlan("agency")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("enterprise")).toBe(false);
    expect(isPaidPlan("past_due")).toBe(false);
  });

  it("rejects client-provided organisation identifiers", () => {
    expect(
      checkoutSchema.safeParse({
        plan: "starter",
        orgId: "attacker-selected-org",
      }).success,
    ).toBe(false);
    expect(checkoutSchema.safeParse({ plan: "starter" }).success).toBe(true);
  });

  it("requires an explicit flag, Stripe secret, and at least one price", () => {
    expect(
      isPaidCheckoutEnabled({
        ENABLE_PAID_CHECKOUT: "true",
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      }),
    ).toBe(false);
    expect(
      isPaidCheckoutEnabled({
        ENABLE_PAID_CHECKOUT: "true",
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
        STRIPE_AGENCY_PRICE_ID: "price_agency",
      }),
    ).toBe(true);
  });

  it("maps paid entitlements from the Stripe price, not mutable metadata", () => {
    const env = {
      STRIPE_STARTER_PRICE_ID: "price_starter",
      STRIPE_PROFESSIONAL_PRICE_ID: "price_professional",
    };

    expect(getPlanForPriceId("price_professional", env)).toBe("professional");
    expect(getPlanForPriceId("price_unknown", env)).toBeNull();
  });

  it("accepts signed checkout identity only when both org references match", () => {
    const valid = {
      clientReferenceId: "org_123",
      metadata: {
        org_id: "org_123",
        user_id: "user_123",
        plan: "professional",
      },
      customerId: "cus_123",
      subscriptionId: "sub_123",
    };

    expect(getVerifiedCheckoutIdentity(valid)).toEqual({
      orgId: "org_123",
      userId: "user_123",
      plan: "professional",
      customerId: "cus_123",
      subscriptionId: "sub_123",
    });
    expect(
      getVerifiedCheckoutIdentity({
        ...valid,
        metadata: { ...valid.metadata, org_id: "org_attacker" },
      }),
    ).toBeNull();
    expect(
      getVerifiedCheckoutIdentity({
        ...valid,
        metadata: { ...valid.metadata, plan: "past_due" },
      }),
    ).toBeNull();
  });

  it("uses only a configured trusted app origin for Stripe redirects", () => {
    expect(
      getAppUrl({ NEXT_PUBLIC_APP_URL: "https://preview.useclippy.com/path" }),
    ).toBe("https://preview.useclippy.com");
    expect(
      getAppUrl({ NEXT_PUBLIC_APP_URL: "http://attacker.example" }),
    ).toBe("https://useclippy.com");
    expect(
      getAppUrl({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }),
    ).toBe("http://localhost:3000");
  });
});
