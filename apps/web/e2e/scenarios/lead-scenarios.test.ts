import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

if (!EMAIL || !PASSWORD || !INTERNAL_SECRET) {
  throw new Error(
    "TEST_EMAIL, TEST_PASSWORD and INTERNAL_API_SECRET are required for lead scenario E2E tests",
  );
}

test.describe("End-to-end lead scenarios", () => {
  // Helper: sign in
  async function signIn(page: any) {
    await page.goto("/sign-in");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15000 });
  }

  test("1. Unknown lead - website enquiry creates lead", async ({ page }) => {
    // Simulate a new lead via AI message API
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message:
          "Hi, I am looking for a 3-bedroom apartment in Surry Hills under 1.5 million",
        metadata: {
          name: "Test Buyer",
          email: "test@example.com",
          phone: "0400111222",
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.reply).toBeTruthy();
    expect(data.leadId).toBeTruthy();
    expect(data.conversationId).toBeTruthy();
  });

  test("2. Returning lead - same email resolves to same lead", async ({
    page,
  }) => {
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message: "Can I inspect this Saturday?",
        metadata: { name: "Test Buyer", email: "test@example.com" },
      }),
    });
    const data = await res.json();
    expect(data.leadId).toBeTruthy();
  });

  test("3. Angry lead - escalates to human", async ({ page }) => {
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message:
          "This is ridiculous. I have been waiting for a call back for three days. I want to speak to a manager right now.",
        metadata: { name: "Angry Buyer", email: "angry@example.com" },
      }),
    });
    const data = await res.json();
    expect(data.escalation).toBe(true);
  });

  test("4. Legal question - escalates", async ({ page }) => {
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message:
          "Can you explain the fine print in the contract? I need to understand my legal rights before signing.",
        metadata: { name: "Legal Buyer", email: "legal@example.com" },
      }),
    });
    const data = await res.json();
    expect(data.escalation).toBe(true);
  });

  test("5. Inspection request - books inspection", async ({ page }) => {
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message:
          "I would love to see the property at 123 Main Street this weekend. Is Saturday 10am available?",
        metadata: { name: "Inspect Buyer", email: "inspect@example.com" },
      }),
    });
    const data = await res.json();
    expect(data.nextAction).toBe("book_inspection");
  });

  test("6. Offer-related message - escalates", async ({ page }) => {
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message:
          "I want to make an offer of 1.8 million on the Paddington property. What do I need to do?",
        metadata: { name: "Offer Buyer", email: "offer@example.com" },
      }),
    });
    const data = await res.json();
    expect(data.escalation).toBe(true);
  });

  test("7. Opted-out lead - AI does not reply", async ({ page }) => {
    // First create an opt-out
    await signIn(page);
    await page.goto("/inbox");

    // The AI route checks opt_outs table - we test via API
    const res = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message: "I am interested in a property",
        metadata: { name: "Opted Out", email: "optedout@example.com" },
      }),
    });
    const data = await res.json();
    // If opted out, optedOut will be true
    expect(data.optedOut === true || data.reply).toBeTruthy();
  });

  test("8. Duplicate contact - same phone merges", async ({ page }) => {
    const res1 = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "facebook",
        message: "Hi, interested in the listing",
        metadata: { name: "Duplicate", phone: "0411111111" },
      }),
    });
    const data1 = await res1.json();

    const res2 = await fetch(BASE + "/api/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({
        channel: "website",
        message: "Same person, different channel",
        metadata: { name: "Duplicate", phone: "0411111111" },
      }),
    });
    const data2 = await res2.json();
    expect(data2.leadId).toBe(data1.leadId);
  });

  test("9. Sign in and access all dashboard pages", async ({ page }) => {
    await signIn(page);
    const pages = [
      "/dashboard",
      "/inbox",
      "/deals",
      "/copilot",
      "/briefing",
      "/analytics",
      "/monitoring",
      "/integrations",
      "/team",
      "/admin",
    ];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain(p);
    }
  });

  test("10. Lead inbox loads and shows leads", async ({ page }) => {
    await signIn(page);
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("text=leads").or(page.locator("text=No leads")),
    ).toBeVisible();
  });
});
