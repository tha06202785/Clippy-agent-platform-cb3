import { describe, expect, it } from "vitest";
import { getPublicBillingCatalog } from "@/lib/billing";

describe("public billing catalog", () => {
  it("publishes the founding offer while keeping checkout unavailable", () => {
    expect(getPublicBillingCatalog({})).toEqual({
      pricingStatus: "assisted_checkout",
      currency: "AUD",
      checkoutEnabled: false,
      plans: [
        {
          id: "starter",
          name: "Founding Agent",
          monthlyPriceCents: 9900,
          audience: "Individual Australian real estate agents",
          seats: 1,
          checkoutAvailable: false,
        },
        {
          id: "agency",
          name: "Founding Team",
          monthlyPriceCents: 39900,
          audience: "Small agency teams joining through assisted onboarding",
          seats: 5,
          checkoutAvailable: false,
        },
      ],
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
    expect(catalog.plans[0]).toMatchObject({
      id: "starter",
      name: "Founding Agent",
      monthlyPriceCents: 9900,
      checkoutAvailable: true,
    });
    expect(catalog.plans[1]).toMatchObject({
      id: "agency",
      checkoutAvailable: false,
    });
    expect(catalog.plans[0]).not.toHaveProperty("priceId");
    expect(JSON.stringify(catalog)).not.toContain("price_internal_secret");
  });
});
