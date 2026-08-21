import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardLayout = readFileSync(
  resolve(process.cwd(), "src/components/dashboard-layout.tsx"),
  "utf8",
);
const propertiesPage = readFileSync(
  resolve(process.cwd(), "src/app/(dashboard)/properties/page.tsx"),
  "utf8",
);
const enquiriesRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/enquiries/route.ts"),
  "utf8",
);

describe("property directory contracts", () => {
  it("routes the Properties navigation to the directory", () => {
    expect(dashboardLayout).toContain('href: "/properties"');
    expect(dashboardLayout).toContain('["/properties", "Properties"]');
    expect(dashboardLayout).toContain('["/inspections", "Inspections"]');
  });

  it("exposes search, creation, Property 360 and inspection actions", () => {
    expect(propertiesPage).toContain('aria-label="Search properties"');
    expect(propertiesPage).toContain("Add property");
    expect(propertiesPage).toContain("Create and link");
    expect(propertiesPage).toContain("Open Property 360");
    expect(propertiesPage).toContain('href="/inspections"');
  });

  it("links enquiries and their conversation context inside the organisation", () => {
    expect(enquiriesRoute).toContain("export async function PATCH");
    expect(enquiriesRoute).toContain('.from("property_enquiries")');
    expect(enquiriesRoute).toContain('.from("conversations")');
    expect(enquiriesRoute).toContain('.eq("org_id", orgId)');
    expect(enquiriesRoute).toContain("conversation_linked: true");
  });
});
