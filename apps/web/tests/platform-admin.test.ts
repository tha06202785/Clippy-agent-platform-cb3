import { describe, expect, it } from "vitest";
import { isPlatformAdminIdentity } from "@/lib/admin-access";

describe("platform admin authorization", () => {
  it("rejects ordinary organisation owners", () => {
    expect(
      isPlatformAdminIdentity(
        { id: "user-owner", email: "owner@agency.test" },
        {},
      ),
    ).toBe(false);
  });

  it("accepts an explicitly allowlisted email without case sensitivity", () => {
    expect(
      isPlatformAdminIdentity(
        { id: "user-1", email: "Founder@Clippy.test" },
        { PLATFORM_ADMIN_EMAILS: "ops@clippy.test, founder@clippy.test" },
      ),
    ).toBe(true);
  });

  it("accepts an explicitly allowlisted user id", () => {
    expect(
      isPlatformAdminIdentity(
        { id: "A8F1-ADMIN", email: null },
        { PLATFORM_ADMIN_USER_IDS: "a8f1-admin" },
      ),
    ).toBe(true);
  });

  it("does not accept partial email or user id matches", () => {
    expect(
      isPlatformAdminIdentity(
        { id: "admin", email: "founder@clippy.test.invalid" },
        {
          PLATFORM_ADMIN_EMAILS: "founder@clippy.test",
          PLATFORM_ADMIN_USER_IDS: "admin-1",
        },
      ),
    ).toBe(false);
  });
});
