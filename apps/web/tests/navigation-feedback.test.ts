import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardLoading = readFileSync(
  resolve(process.cwd(), "src/app/(dashboard)/loading.tsx"),
  "utf8",
);
const dashboardLayout = readFileSync(
  resolve(process.cwd(), "src/components/dashboard-layout.tsx"),
  "utf8",
);
const mobileNav = readFileSync(
  resolve(process.cwd(), "src/components/mobile-nav.tsx"),
  "utf8",
);

describe("dashboard navigation feedback", () => {
  it("provides an accessible route-level skeleton", () => {
    expect(dashboardLoading).toContain('role="status"');
    expect(dashboardLoading).toContain('aria-label="Loading page"');
    expect(dashboardLoading).toContain("animate-pulse");
  });

  it("acknowledges desktop navigation immediately", () => {
    expect(dashboardLayout).toContain("setPendingHref(item.href)");
    expect(dashboardLayout).toContain('role="progressbar"');
    expect(dashboardLayout).toContain("LoaderCircle");
    expect(dashboardLayout).toContain("aria-busy");
  });

  it("acknowledges mobile navigation immediately", () => {
    expect(mobileNav).toContain("setPendingHref(item.href)");
    expect(mobileNav).toContain("LoaderCircle");
    expect(mobileNav).toContain("aria-busy");
  });
});
