import { describe, expect, it } from "vitest";
import { normaliseLeadIdentity } from "@/lib/leads/resolve-or-create";

describe("lead identity normalisation", () => {
  it("normalises email case and whitespace", () => {
    expect(normaliseLeadIdentity("email", "  Agent+Buyer@Example.COM ")).toBe(
      "agent+buyer@example.com",
    );
  });

  it("normalises WhatsApp phone formatting", () => {
    expect(normaliseLeadIdentity("whatsapp", "+61 (0) 412 345 678")).toBe(
      "61412345678",
    );
  });

  it("preserves page-scoped Facebook identifiers", () => {
    expect(normaliseLeadIdentity("facebook", "  psid_ABC123  ")).toBe("psid_ABC123");
  });
});
