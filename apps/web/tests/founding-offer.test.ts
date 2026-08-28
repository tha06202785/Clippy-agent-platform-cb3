import { describe, expect, it } from "vitest";
import {
  getOnboardingCompletionPath,
  getRequestedFoundingPlan,
  getSignupCompletionPath,
} from "@/lib/founding-offer";

describe("founding offer navigation", () => {
  it("preserves the supported plan through signup and onboarding", () => {
    expect(getRequestedFoundingPlan("?plan=starter")).toBe("starter");
    expect(getSignupCompletionPath("?plan=starter")).toBe(
      "/onboarding?plan=starter",
    );
    expect(getOnboardingCompletionPath("?plan=starter")).toBe(
      "/admin/billing?subscribe=starter",
    );
  });

  it("ignores unsupported plan and redirect values", () => {
    expect(getRequestedFoundingPlan("?plan=agency")).toBeNull();
    expect(getSignupCompletionPath("?plan=https://evil.example")).toBe(
      "/onboarding",
    );
    expect(getOnboardingCompletionPath("?next=//evil.example")).toBe(
      "/dashboard",
    );
  });

  it("takes invited pilot agents to their automatic setup checklist", () => {
    expect(getOnboardingCompletionPath("?pilot=1")).toBe("/pilot/setup");
  });
});
