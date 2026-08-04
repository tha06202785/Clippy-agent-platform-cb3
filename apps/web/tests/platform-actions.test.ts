import { describe, expect, it } from "vitest";
import {
  expectedPlatformConfirmation,
  isTrustedPlatformActionOrigin,
  platformActionSchema,
} from "@/lib/platform-actions";

describe("platform administrator actions", () => {
  it("requires exact confirmation text", () => {
    const result = platformActionSchema.safeParse({
      action: "suspend_account",
      orgId: "37a3cc1b-3acd-4d28-a785-8db131f17021",
      reason: "Confirmed abuse investigation",
      confirmation: "suspend",
    });
    expect(result.success).toBe(false);
  });

  it("accepts only the request URL's exact origin", () => {
    expect(
      isTrustedPlatformActionOrigin(
        "https://useclippy.com",
        "https://useclippy.com/api/admin/platform/actions",
      ),
    ).toBe(true);
    expect(
      isTrustedPlatformActionOrigin(
        "https://evil.example",
        "https://useclippy.com/api/admin/platform/actions",
      ),
    ).toBe(false);
    expect(
      isTrustedPlatformActionOrigin(
        null,
        "https://useclippy.com/api/admin/platform/actions",
      ),
    ).toBe(false);
  });

  it("requires a target for retry and integration reset", () => {
    const result = platformActionSchema.safeParse({
      action: "retry_communication",
      orgId: "37a3cc1b-3acd-4d28-a785-8db131f17021",
      reason: "Customer requested a retry",
      confirmation: "RETRY",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully confirmed recovery action", () => {
    expect(
      platformActionSchema.safeParse({
        action: "reset_integration",
        orgId: "37a3cc1b-3acd-4d28-a785-8db131f17021",
        targetId: "73d6dc5e-2dd4-454f-b750-22204de03a3d",
        reason: "OAuth credentials are invalid",
        confirmation: expectedPlatformConfirmation("reset_integration"),
      }).success,
    ).toBe(true);
  });
});
