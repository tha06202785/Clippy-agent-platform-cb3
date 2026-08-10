import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  automationSecretIssues,
  readAutomationSecret,
  secureSecretMatch,
} from "@/lib/automation-security";

const strongA = "a".repeat(32);
const strongB = "b".repeat(32);

describe("automation security", () => {
  it("requires separate strong server-side secrets", () => {
    expect(automationSecretIssues({})).toEqual([
      "CRON_SECRET is missing",
      "INTERNAL_API_SECRET is missing",
    ]);
    expect(
      automationSecretIssues({
        CRON_SECRET: strongA,
        INTERNAL_API_SECRET: strongA,
      }),
    ).toContain("Automation secrets must be different");
    expect(
      automationSecretIssues({
        CRON_SECRET: strongA,
        INTERNAL_API_SECRET: strongB,
      }),
    ).toEqual([]);
  });

  it("does not accept weak secrets", () => {
    expect(readAutomationSecret("CRON_SECRET", { CRON_SECRET: "short" })).toBeNull();
    expect(readAutomationSecret("CRON_SECRET", { CRON_SECRET: strongA })).toBe(strongA);
  });

  it("compares credentials without normal string equality", () => {
    expect(secureSecretMatch(strongA, strongA)).toBe(true);
    expect(secureSecretMatch(strongB, strongA)).toBe(false);
    expect(secureSecretMatch("short", strongA)).toBe(false);
  });

  it("never falls back to the first organisation for an internal job", () => {
    const route = readFileSync(
      resolve(process.cwd(), "src/app/api/ai/message/route.ts"),
      "utf8",
    );
    expect(route).toContain(".eq(\"id\", body.orgId)");
    expect(route).not.toContain(
      '.from("orgs").select("id").limit(1)',
    );
  });
});
