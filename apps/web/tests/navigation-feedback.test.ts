import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageSkeleton } from "@clippy/ui";
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
    const html = renderToStaticMarkup(createElement(PageSkeleton));

    expect(dashboardLoading).toContain("<PageSkeleton />");
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading page");
    expect(html).toContain("animate-pulse");
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
