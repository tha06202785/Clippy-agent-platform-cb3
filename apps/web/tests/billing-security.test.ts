import { describe, expect, it } from "vitest";
import {
  checkoutEmailMatchesBillingContact,
  getAppUrl,
  getBillingContactFromUser,
  getBillingConfigurationStatus,
  getPhoneLast4,
  getPlanForPriceId,
  getStripeMode,
  getVerifiedCheckoutIdentity,
  isPaidCheckoutEnabled,
  isPaidPlan,
  normaliseBillingEmail,
  stripeEventMatchesConfiguredMode,
  stripeCustomerMatchesBillingContact,
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
        STRIPE_SECRET_KEY: "sk_test_1234567890example",
        STRIPE_WEBHOOK_SECRET: "whsec_1234567890example",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY:
          "eyJhbGciOiJIUzI1NiJ9.valid-service-role-token",
      }),
    ).toBe(false);
    expect(
      isPaidCheckoutEnabled({
        ENABLE_PAID_CHECKOUT: "true",
        STRIPE_SECRET_KEY: "sk_test_1234567890example",
        STRIPE_WEBHOOK_SECRET: "whsec_1234567890example",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY:
          "eyJhbGciOiJIUzI1NiJ9.valid-service-role-token",
        STRIPE_STARTER_PRICE_ID: "price_1234567890starter",
      }),
    ).toBe(true);
  });

  it("rejects placeholders, malformed prices and test keys in production", () => {
    const placeholder = getBillingConfigurationStatus({
      ENABLE_PAID_CHECKOUT: "true",
      STRIPE_SECRET_KEY: "your_stripe_secret_key",
      STRIPE_WEBHOOK_SECRET: "your_stripe_webhook_signing_secret",
      STRIPE_STARTER_PRICE_ID: "price_starter",
      NEXT_PUBLIC_SUPABASE_URL: "your_supabase_url",
      SUPABASE_SERVICE_ROLE_KEY: "your_supabase_service_role",
    });
    expect(placeholder.checkoutEnabled).toBe(false);
    expect(placeholder.issues).toEqual(
      expect.arrayContaining([
        "Stripe secret key is missing or invalid",
        "Founding Agent Stripe price is missing or invalid",
      ]),
    );

    const productionTestMode = getBillingConfigurationStatus({
      VERCEL_ENV: "production",
      ENABLE_PAID_CHECKOUT: "true",
      STRIPE_SECRET_KEY: "sk_test_1234567890example",
      STRIPE_WEBHOOK_SECRET: "whsec_1234567890example",
      STRIPE_STARTER_PRICE_ID: "price_1234567890starter",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY:
        "eyJhbGciOiJIUzI1NiJ9.valid-service-role-token",
    });
    expect(productionTestMode.checkoutEnabled).toBe(false);
    expect(productionTestMode.issues).toContain(
      "Production requires a live-mode Stripe key",
    );
  });

  it("keeps webhook events in the configured Stripe mode", () => {
    expect(getStripeMode("sk_live_1234567890example")).toBe("live");
    expect(getStripeMode("rk_test_1234567890example")).toBe("test");
    expect(getStripeMode("invalid")).toBe("unknown");
    expect(
      stripeEventMatchesConfiguredMode(true, {
        STRIPE_SECRET_KEY: "sk_live_1234567890example",
      }),
    ).toBe(true);
    expect(
      stripeEventMatchesConfiguredMode(false, {
        STRIPE_SECRET_KEY: "sk_live_1234567890example",
      }),
    ).toBe(false);
  });

  it("maps paid entitlements from the Stripe price, not mutable metadata", () => {
    const env = {
      STRIPE_STARTER_PRICE_ID: "price_1234567890starter",
      STRIPE_PROFESSIONAL_PRICE_ID: "price_1234567890professional",
    };

    expect(getPlanForPriceId("price_1234567890professional", env)).toBe(
      "professional",
    );
    expect(getPlanForPriceId("price_unknown", env)).toBeNull();
  });

  it("accepts signed checkout identity only when both org references match", () => {
    const valid = {
      clientReferenceId: "org_123",
      metadata: {
        org_id: "org_123",
        user_id: "user_123",
        billing_contact_user_id: "user_123",
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
    expect(
      getVerifiedCheckoutIdentity({
        ...valid,
        metadata: {
          ...valid.metadata,
          billing_contact_user_id: "different_user",
        },
      }),
    ).toBeNull();
  });

  it("normalises the signed-in agent as the billing contact", () => {
    expect(normaliseBillingEmail(" Agent@Agency.COM ")).toBe(
      "agent@agency.com",
    );
    expect(
      getBillingContactFromUser({
        id: "user_123",
        email: " Agent@Agency.COM ",
        phone: "+61 400 111 222",
        user_metadata: { full_name: "Alex Agent" },
      }),
    ).toEqual({
      userId: "user_123",
      email: "agent@agency.com",
      phone: "+61 400 111 222",
      name: "Alex Agent",
    });
    expect(getPhoneLast4("+61 400 111 222")).toBe("1222");
  });

  it("never reuses a Stripe customer owned by another org or user", () => {
    const customer = {
      id: "cus_123",
      email: "agent@agency.com",
      metadata: {
        org_id: "org_123",
        billing_contact_user_id: "user_123",
      },
    } as any;
    const contact = {
      userId: "user_123",
      email: "agent@agency.com",
      name: "Alex Agent",
      phone: null,
    };

    expect(
      stripeCustomerMatchesBillingContact(customer, {
        orgId: "org_123",
        contact,
      }),
    ).toBe(true);
    expect(
      stripeCustomerMatchesBillingContact(customer, {
        orgId: "different_org",
        contact,
      }),
    ).toBe(false);
    expect(
      stripeCustomerMatchesBillingContact(customer, {
        orgId: "org_123",
        contact: { ...contact, userId: "different_user" },
      }),
    ).toBe(false);
  });

  it("requires Checkout's collected email to match the billing contact", () => {
    expect(
      checkoutEmailMatchesBillingContact(
        "Agent@Agency.com",
        "agent@agency.com",
      ),
    ).toBe(true);
    expect(
      checkoutEmailMatchesBillingContact(
        "founder@clippy.example",
        "agent@agency.com",
      ),
    ).toBe(false);
  });

  it("uses only a configured trusted app origin for Stripe redirects", () => {
    expect(
      getAppUrl({ NEXT_PUBLIC_APP_URL: "https://preview.useclippy.com/path" }),
    ).toBe("https://preview.useclippy.com");
    expect(getAppUrl({ NEXT_PUBLIC_APP_URL: "http://attacker.example" })).toBe(
      "https://useclippy.com",
    );
    expect(getAppUrl({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    );
  });
});
