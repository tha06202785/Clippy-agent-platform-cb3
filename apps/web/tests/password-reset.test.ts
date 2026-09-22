import { describe, expect, it } from "vitest";
import {
  getPasswordResetRedirectUrl,
  validateNewPassword,
} from "@/lib/password-reset";
import { isProtectedPath } from "@/lib/supabase/middleware";

describe("password recovery", () => {
  it("returns recovery emails to the password update screen", () => {
    expect(getPasswordResetRedirectUrl("https://useclippy.com/")).toBe(
      "https://useclippy.com/api/auth/callback?next=%2Freset-password",
    );
  });

  it("rejects short and mismatched passwords", () => {
    expect(validateNewPassword("short", "short")).toBe(
      "Password must be at least 8 characters.",
    );
    expect(validateNewPassword("new-password", "different-password")).toBe(
      "Passwords do not match.",
    );
    expect(validateNewPassword("new-password", "new-password")).toBeNull();
  });

  it("keeps both recovery screens available before sign-in", () => {
    expect(isProtectedPath("/forgot-password")).toBe(false);
    expect(isProtectedPath("/reset-password")).toBe(false);
  });
});
