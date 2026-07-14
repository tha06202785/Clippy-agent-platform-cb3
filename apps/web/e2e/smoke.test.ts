import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Clippy")).toBeVisible();
  await expect(page.locator("text=Start your free trial")).toBeVisible();
});

test("pricing page loads", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator("text=Solo")).toBeVisible();
});

test("sign-in page loads", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("text=Sign in")).toBeVisible();
});

test("health API returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.status).toBe("ok");
});

test("subscription plans API returns plans", async ({ request }) => {
  const response = await request.get("/api/subscription/plans");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(Array.isArray(data)).toBeTruthy();
  expect(data.length).toBeGreaterThan(0);
});

test("leads API returns 401 without auth", async ({ request }) => {
  const response = await request.get("/api/leads");
  expect(response.status()).toBe(401);
});

test("security page loads", async ({ page }) => {
  await page.goto("/security");
  await expect(page.locator("text=Security")).toBeVisible();
});

test("privacy page loads", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("text=Privacy Policy")).toBeVisible();
});

test("terms page loads", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.locator("text=Terms of Service")).toBeVisible();
});

test("analytics page redirects to sign-in when not authenticated", async ({ page }) => {
  await page.goto("/analytics");
  await expect(page).toHaveURL(/sign-in/);
});
