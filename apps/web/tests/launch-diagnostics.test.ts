import { describe, expect, it } from "vitest";
import {
  classifyAIProviderHealth,
  isActionableCRMLead,
  isActionablePropertyEnquiry,
  summariseCRMIdentityHealth,
  summarisePropertyContextHealth,
} from "@/lib/launch-diagnostics";

describe("launch diagnostics", () => {
  it("excludes deliberately dismissed, closed and test enquiries", () => {
    expect(
      isActionablePropertyEnquiry({
        status: "closed",
        metadata: { dismissed_reason: "not a property enquiry" },
      }),
    ).toBe(false);
    expect(
      isActionablePropertyEnquiry({
        status: "contacted",
        metadata: { test_data: true },
      }),
    ).toBe(false);
  });

  it("keeps missing context on active enquiries as a launch blocker", () => {
    const result = summarisePropertyContextHealth([
      { status: "active", lead_id: "lead-1", listing_id: null },
      {
        status: "closed",
        lead_id: "lead-2",
        listing_id: null,
        metadata: { dismissed_at: "2026-09-15T00:00:00Z" },
      },
      { status: "active", lead_id: "lead-3", listing_id: "listing-1" },
    ]);

    expect(result.invalid).toHaveLength(1);
    expect(result.excluded).toBe(1);
    expect(result.actionable).toHaveLength(2);
  });

  it("requires a clean latest AI result rather than configuration alone", () => {
    expect(classifyAIProviderHealth({ configured: false }).status).toBe(
      "error",
    );
    expect(
      classifyAIProviderHealth({
        configured: true,
        latest: {
          status: "success",
          provider: "ollama",
          error_code: "provider_authentication_failed",
        },
      }).status,
    ).toBe("warning");
    expect(
      classifyAIProviderHealth({
        configured: true,
        latest: { status: "success", provider: "ollama", latency_ms: 4200 },
      }),
    ).toMatchObject({ status: "healthy" });
  });

  it("excludes merged, test and placeholder CRM identities", () => {
    expect(
      isActionableCRMLead({ status: "merged", source: "facebook" }),
    ).toBe(false);
    expect(
      isActionableCRMLead({ status: "new", source: "comprehensive_test" }),
    ).toBe(false);

    const result = summariseCRMIdentityHealth([
      { status: "active", source: "email", phone: "+61 412 345 678" },
      { status: "new", source: "website", phone: "0412 345 678" },
      { status: "new", source: "comprehensive_test", phone: "0400 123 456" },
      { status: "active", source: "email", phone: "0400 123 456" },
      { status: "merged", source: "facebook", phone: "0499 111 222" },
      { status: "new", source: "whatsapp", phone: "0499 111 222" },
    ]);

    expect(result).toMatchObject({
      duplicateIdentities: 0,
      excludedLeads: 2,
      ignoredPlaceholderPhones: 2,
    });
  });

  it("still reports genuine duplicate identities on active records", () => {
    expect(
      summariseCRMIdentityHealth([
        { status: "active", source: "email", email: "buyer@example.com" },
        { status: "new", source: "website", email: "BUYER@example.com" },
      ]).duplicateIdentities,
    ).toBe(1);
  });
});
