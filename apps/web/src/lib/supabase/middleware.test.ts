import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/supabase/middleware";

describe("workspace route protection", () => {
  it.each([
    "/dashboard",
    "/calendar",
    "/clients",
    "/inspections",
    "/knowledge",
    "/knowledge/documents/123",
    "/admin/platform",
  ])("protects %s", (pathname) => {
    expect(isProtectedPath(pathname)).toBe(true);
  });

  it.each(["/", "/pricing", "/security", "/sign-in", "/signup"])(
    "keeps %s public",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
    },
  );

  it("does not protect unrelated prefix collisions", () => {
    expect(isProtectedPath("/dashboard-public")).toBe(false);
  });
});
