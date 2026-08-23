import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "";
const PASSWORD = process.env.TEST_PASSWORD || "";
const HAS_AUTH_CREDENTIALS = Boolean(EMAIL && PASSWORD);

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

test.describe("Authenticated flows", () => {
  test.skip(
    !HAS_AUTH_CREDENTIALS,
    "TEST_EMAIL and TEST_PASSWORD are required for authenticated E2E tests",
  );

  test("sign in and access dashboard", async ({ page }) => {
    await signIn(page);
    await expect(
      page
        .getByText("Good morning")
        .or(page.getByText("Good afternoon"))
        .or(page.getByText("Good evening")),
    ).toBeVisible();
  });

  test("sidebar navigation matches the current product", async ({ page }) => {
    await signIn(page);
    for (const item of [
      "Today",
      "Calendar",
      "Conversations",
      "Clients",
      "Opportunities",
      "Properties",
      "Clippy",
      "Learning Centre",
      "Team",
    ]) {
      await expect(
        page.getByRole("link", { name: item, exact: true }).first(),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: "Properties", exact: true }).first(),
    ).toHaveAttribute("href", "/properties");
  });

  test("properties page exposes search and property creation", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/properties");
    await expect(
      page.getByRole("heading", { name: "Property directory" }),
    ).toBeVisible();
    await expect(page.getByLabel("Search properties")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add property" }),
    ).toBeVisible();
  });

  test("conversations page loads its list state", async ({ page }) => {
    await signIn(page);
    await page.goto("/inbox");
    await expect(
      page
        .getByRole("heading", { name: "Conversations" })
        .first()
        .or(page.getByText("No conversations match this view.")),
    ).toBeVisible();
  });

  test("opportunities page loads its pipeline state", async ({ page }) => {
    await signIn(page);
    await page.goto("/deals");
    await expect(
      page
        .getByRole("heading", { name: "Pipeline" })
        .or(page.getByText("No opportunities yet")),
    ).toBeVisible();
  });

  test("Clippy page accepts a message", async ({ page }) => {
    await signIn(page);
    await page.goto("/copilot");
    await expect(page.getByLabel("Message Clippy")).toBeVisible();
  });

  test("analytics page loads", async ({ page }) => {
    await signIn(page);
    await page.goto("/analytics");
    await expect(
      page
        .getByRole("heading", { name: "Analytics" })
        .or(page.getByRole("heading", { name: "Performance unavailable" })),
    ).toBeVisible();
  });

  test("integrations page exposes account connections", async ({ page }) => {
    await signIn(page);
    await page.goto("/integrations");
    await expect(
      page
        .getByRole("heading", { name: "Integrations" })
        .or(page.getByText("Gmail").first()),
    ).toBeVisible();
  });

  test("sign out works", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForURL("**/sign-in", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("mobile navigation and menu are keyboard-accessible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    const menu = page.getByRole("button", { name: "Open navigation menu" });
    await menu.click();
    await expect(
      page.getByRole("complementary", { name: "Dashboard navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  });

  test("theme toggle applies and persists dark mode", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Use dark theme" }).last().click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("knowledge dialog traps focus and dismisses with Escape", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/knowledge");
    await page.getByRole("button", { name: "Add knowledge" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add knowledge" }),
    ).toBeVisible();
    await expect(page.getByLabel("Title")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Add knowledge" }),
    ).toBeHidden();
  });

  test("audited filters and view controls update the interface", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);

    await page.goto("/clients");
    const clientSearch = page.getByLabel("Search clients");
    await clientSearch.fill("James");
    await expect(clientSearch).toHaveValue("James");
    await expect(page.getByText("James", { exact: false }).first()).toBeVisible();

    await page.goto("/calendar");
    const calendarSearch = page.getByLabel("Search calendar");
    await calendarSearch.fill("Alice");
    await expect(calendarSearch).toHaveValue("Alice");
    await expect(
      page.getByText("Follow up with Alice Buyer", { exact: false }).first(),
    ).toBeVisible();

    await page.goto("/properties");
    await page.getByLabel("Filter properties by status").selectOption("sold");
    await expect(page.getByText(/of \d+ properties?/)).toBeVisible();
    const propertyStatuses = page.locator("article span", {
      hasText: /^sold$/i,
    });
    await expect(
      propertyStatuses.first().or(page.getByText("No matching properties")),
    ).toBeVisible();

    await page.goto("/deals");
    await page.getByRole("button", { name: "List", exact: true }).click();
    await expect(
      page.getByRole("table", { name: "Opportunity pipeline" }),
    ).toBeVisible();

    await page.goto("/inbox");
    const emailFilter = page.getByRole("button", { name: "Email", exact: true });
    if (await emailFilter.isVisible()) {
      await emailFilter.click();
      await expect(emailFilter).toHaveAttribute("aria-pressed", "true");
    }

    await page.goto("/knowledge");
    await page.getByLabel("Search agency knowledge").fill("school fees");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Search results" }),
    ).toBeVisible();

    await page.goto("/team");
    await page.getByRole("button", { name: "Invite member" }).click();
    await expect(page.getByLabel("Colleague email")).toBeVisible();

    await page.goto("/admin/control-centre");
    await page.getByRole("link", { name: "Billing", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/billing$/);
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  });
});
