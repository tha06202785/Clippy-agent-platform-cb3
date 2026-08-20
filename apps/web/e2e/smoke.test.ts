import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn every enquiry into a clear next action.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a workspace" }).first(),
  ).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("pricing page loads", async ({ page }) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", {
      name: "Pilot scope before published pricing.",
    }),
  ).toBeVisible();
});

test("sign-in page loads", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("health API returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.status).toBe("ok");
});

test("subscription plans API returns honest rollout status", async ({
  request,
}) => {
  const response = await request.get("/api/subscription/plans");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(Array.isArray(data.plans)).toBeTruthy();
  expect(["pilot", "checkout_ready"]).toContain(data.pricingStatus);
  expect(data.plans.every((plan: object) => !("priceId" in plan))).toBeTruthy();
});

test("leads API returns 401 without auth", async ({ request }) => {
  const response = await request.get("/api/leads");
  expect(response.status()).toBe(401);
});

test("security page loads", async ({ page }) => {
  await page.goto("/security");
  await expect(
    page.getByRole("heading", {
      name: "Controls we can explain and verify.",
    }),
  ).toBeVisible();
});

test("privacy page loads", async ({ page }) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();
});

test("terms page loads", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.locator("text=Terms of Service")).toBeVisible();
});

test("analytics redirects to sign-in when not authenticated", async ({
  page,
}) => {
  await page.goto("/analytics");
  await expect(page).toHaveURL(/sign-in/);
});

test("unknown routes show a useful recovery action", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "We could not find that page" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to Today" }),
  ).toBeVisible();
});
