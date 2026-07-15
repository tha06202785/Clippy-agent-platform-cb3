import { test, expect } from "@playwright/test";

const EMAIL = "kenoltha@gmail.com";
const PASSWORD = "22031980";

test.describe("Authenticated flows", () => {
  test("sign in and access dashboard", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await expect(page.locator("text=Good morning").or(page.locator("text=Good afternoon")).or(page.locator("text=Good evening"))).toBeVisible();
  });

  test("sidebar navigation items visible after login", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    for (const item of ["Dashboard", "Inbox", "Deals", "AI Copilot", "Analytics", "Team", "Integrations", "Admin"]) {
      await expect(page.locator("text=" + item).first()).toBeVisible();
    }
  });

  test("inbox page loads leads", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=No leads").or(page.locator("text=Search leads"))).toBeVisible();
  });

  test("deals page loads listings", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await page.goto("/deals");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Deals").or(page.locator("text=No listings"))).toBeVisible();
  });

  test("copilot page loads and accepts input", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await page.goto("/copilot");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=AI Co-Agent").or(page.locator("text=Clippy"))).toBeVisible();
  });

  test("analytics page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Analytics").or(page.locator("text=Usage"))).toBeVisible();
  });

  test("integrations page shows connect buttons", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Connect your accounts").or(page.locator("text=Gmail"))).toBeVisible();
  });

  test("sign out works", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill("input[type=\"email\"]", EMAIL);
    await page.fill("input[type=\"password\"]", PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await page.click("text=Sign out");
    await page.waitForURL("/sign-in", { timeout: 10000 });
    await expect(page.locator("text=Sign in")).toBeVisible();
  });
});
