import { expect, test } from "@playwright/test";
import { copilotGoldenDataset } from "../evals/copilot-golden-dataset";

const EMAIL = process.env.TEST_EMAIL || "";
const PASSWORD = process.env.TEST_PASSWORD || "";
const HAS_QA_CREDENTIALS = Boolean(EMAIL && PASSWORD);

test.describe("Copilot live golden dataset", () => {
  test.skip(
    !HAS_QA_CREDENTIALS,
    "Dedicated TEST_EMAIL and TEST_PASSWORD are required for live Copilot evaluation",
  );

  test("reports launch-critical response invariants", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/sign-in");
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("/dashboard", { timeout: 15_000 });

    for (const testCase of copilotGoldenDataset) {
      const response = await page.request.post("/api/copilot/chat", {
        data: { message: testCase.message },
        headers: { "x-request-id": `golden-${testCase.id}` },
      });
      expect(response.status(), testCase.id).toBe(testCase.expectedStatus);

      const body = await response.json();
      expect(body.reply, testCase.id).toEqual(expect.any(String));
      expect(body.request_id, testCase.id).toEqual(expect.any(String));
      expect(body.context_used, testCase.id).toEqual(expect.any(Object));

      const reply = body.reply.toLowerCase();
      for (const phrase of testCase.forbidPhrases || []) {
        expect(reply, testCase.id).not.toContain(phrase.toLowerCase());
      }
      if (testCase.requireAnyPhrase?.length) {
        expect(
          testCase.requireAnyPhrase.some((phrase) => reply.includes(phrase.toLowerCase())),
          `${testCase.id}: ${body.reply}`,
        ).toBe(true);
      }
      if (testCase.requiresApproval) {
        expect(body.proposed_action?.requiresApproval, testCase.id).toBe(true);
      }
    }
  });
});

