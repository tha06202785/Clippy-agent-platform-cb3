import { describe, expect, it } from "vitest";
import {
  buildOnboardingSummary,
  buildPersonalWorkspaceSeed,
} from "@/lib/onboarding";

describe("onboarding foundations", () => {
  it("builds a deterministic owner workspace for an orphaned auth user", () => {
    const seed = buildPersonalWorkspaceSeed({
      userId: "4c08aa3b-5c50-431d-b849-e9eb95ff7b8c",
      fullName: "  Clippy QA  ",
      agencyName: "Clippy QA Workspace",
    });

    expect(seed.organisation.id).toBe(seed.membership.org_id);
    expect(seed.membership.role).toBe("owner");
    expect(seed.profile.full_name).toBe("Clippy QA");
  });

  it("reports only verified onboarding outcomes", () => {
    const summary = buildOnboardingSummary({
      primaryCrmName: "No CRM yet",
      importResults: {
        contacts: 0,
        listings: 0,
        inspections: 0,
        calendar_events: 0,
      },
    });

    expect(summary).toContain("No business data imported yet");
    expect(summary).toContain(
      "No connected email or calendar account was synced",
    );
    expect(summary.join(" ")).not.toMatch(
      /326 contacts|41 listings|Gmail connected|Facebook connected/i,
    );
  });

  it("includes only positive import counts", () => {
    const summary = buildOnboardingSummary({
      primaryCrmName: "Rex",
      importResults: { contacts: 3, listings: 0, calendar_events: 2 },
      importSources: [
        { label: "Google (agent@example.com)", status: "synced" },
      ],
    });

    expect(summary).toContain("3 contacts imported");
    expect(summary).toContain("2 calendar events imported");
    expect(summary).toContain("Google (agent@example.com) synced");
    expect(summary).not.toContain("0 listings imported");
  });

  it("reports learned writing examples and partial import warnings", () => {
    const summary = buildOnboardingSummary({
      primaryCrmName: "No CRM yet",
      importResults: { writing_examples: 12 },
      importSources: [{ label: "Microsoft 365", status: "failed" }],
      importWarnings: ["Microsoft 365 needs to be reconnected"],
    });

    expect(summary).toContain("12 writing examples imported");
    expect(summary).toContain("1 import warning needs attention");
  });
});
