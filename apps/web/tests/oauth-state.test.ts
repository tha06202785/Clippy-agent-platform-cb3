import { describe, expect, it } from "vitest";
import { matchesOAuthState } from "@/lib/oauth-state";

describe("OAuth state validation", () => {
  it("accepts only the exact one-time state", () => {
    expect(matchesOAuthState("known-state", "known-state")).toBe(true);
    expect(matchesOAuthState("known-state", "other-state")).toBe(false);
  });

  it("fails closed for missing or differently sized values", () => {
    expect(matchesOAuthState(undefined, "state")).toBe(false);
    expect(matchesOAuthState("state", null)).toBe(false);
    expect(matchesOAuthState("state", "state-longer")).toBe(false);
  });
});
