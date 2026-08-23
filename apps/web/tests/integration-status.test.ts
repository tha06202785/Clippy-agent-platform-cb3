import { describe, expect, it } from "vitest";
import {
  getGooglePermissionSummary,
  isIntegrationStale,
  requiresReconnectAfterTest,
} from "../src/lib/integration-status";

describe("integration status", () => {
  it("reports required Gmail permissions without counting unrelated scopes", () => {
    expect(
      getGooglePermissionSummary(
        "gmail",
        [
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/calendar.events",
        ].join(" "),
      ),
    ).toEqual({
      granted: 1,
      required: 1,
      missing: [],
    });
  });

  it("reports a missing Calendar permission", () => {
    expect(
      getGooglePermissionSummary(
        "google-calendar",
        "https://www.googleapis.com/auth/gmail.modify",
      ),
    ).toEqual({
      granted: 0,
      required: 1,
      missing: ["https://www.googleapis.com/auth/calendar.events"],
    });
  });

  it("clears a stale reconnect flag after a successful test", () => {
    expect(
      requiresReconnectAfterTest({
        success: true,
        status: "healthy",
      }),
    ).toBe(false);
  });

  it("requires reconnect only for connection failures that need consent", () => {
    expect(
      requiresReconnectAfterTest({
        success: false,
        action: "reconnect",
        status: "missing_permissions",
      }),
    ).toBe(true);
    expect(
      requiresReconnectAfterTest({
        success: false,
        action: "refresh",
        status: "token_expired",
      }),
    ).toBe(false);
  });

  it("marks connected integrations as stale after seven days", () => {
    const now = new Date("2026-08-22T00:00:00.000Z");
    expect(isIntegrationStale("2026-08-14T23:59:59.000Z", now)).toBe(true);
    expect(isIntegrationStale("2026-08-21T00:00:00.000Z", now)).toBe(false);
    expect(isIntegrationStale(undefined, now)).toBe(false);
  });
});
