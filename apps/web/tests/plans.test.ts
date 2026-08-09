import { describe, expect, it } from "vitest";
import { getPublicBillingCatalog } from "@/lib/billing";

describe("public billing catalog", () => {
  it("stays in pilot mode without an explicit checkout rollout", () => {
    expect(getPublicBillingCatalog({})).toEqual({
      pricingStatus: "pilot",
      currency: "AUD",
      checkoutEnabled: false,
      plans: [],
    });
  });

  it("only exposes configured canonical plans without Stripe price IDs", () => {
    const catalog = getPublicBillingCatalog({
      ENABLE_PAID_CHECKOUT: "true",
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      STRIPE_STARTER_PRICE_ID: "price_internal_secret",
    });

    expect(catalog.pricingStatus).toBe("checkout_ready");
    expect(catalog.plans).toEqual([
      {
        id: "starter",
        name: "Starter",
        checkoutAvailable: true,
      },
    ]);
    expect(catalog.plans[0]).not.toHaveProperty("priceId");
    expect(JSON.stringify(catalog)).not.toContain("price_internal_secret");
  });
});
