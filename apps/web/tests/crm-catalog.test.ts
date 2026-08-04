import { describe, expect, it } from "vitest";
import { CRM_IDS, CRM_OPTIONS, crmName } from "@/lib/crm-catalog";

describe("CRM onboarding catalogue", () => {
  it("includes the priority Australian real-estate systems", () => {
    expect(CRM_IDS.has("rex")).toBe(true);
    expect(CRM_IDS.has("agentbox")).toBe(true);
    expect(CRM_IDS.has("vaultre")).toBe(true);
    expect(CRM_IDS.has("boxdice")).toBe(true);
    expect(CRM_IDS.has("propertyme")).toBe(true);
    expect(CRM_IDS.has("propertytree")).toBe(true);
    expect(CRM_IDS.has("console")).toBe(true);
    expect(CRM_IDS.has("inspectrealestate")).toBe(true);
  });

  it("has unique identifiers and explicit fallback choices", () => {
    expect(new Set(CRM_OPTIONS.map((crm) => crm.id)).size).toBe(
      CRM_OPTIONS.length,
    );
    expect(CRM_IDS.has("other")).toBe(true);
    expect(CRM_IDS.has("none")).toBe(true);
  });

  it("resolves a selected CRM to a stable display name", () => {
    expect(crmName("boxdice")).toBe("MRI Box+Dice");
    expect(crmName("not-real")).toBe("Selected CRM");
  });
});
