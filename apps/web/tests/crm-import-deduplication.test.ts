import { describe, expect, it } from "vitest";
import {
  createImportDuplicateGuard,
  normaliseImportEmail,
  normaliseImportPhone,
} from "@/lib/crm-import-deduplication";

describe("CRM import duplicate protection", () => {
  it("normalises email and phone identifiers", () => {
    expect(normaliseImportEmail(" Buyer@Example.COM ")).toBe("buyer@example.com");
    expect(normaliseImportPhone("+61 (0) 412 345 678")).toBe("610412345678");
  });

  it("checks email and phone independently", () => {
    const guard = createImportDuplicateGuard([
      { id: "lead-1", email: "buyer@example.com", phone: "0412 111 111" },
    ]);
    expect(guard({ email: "BUYER@example.com", phone: "0499 999 999" })).toBe("duplicate_email");
    expect(guard({ email: "new@example.com", phone: "0412111111" })).toBe("duplicate_phone");
  });

  it("detects duplicates inside the same upload", () => {
    const guard = createImportDuplicateGuard([]);
    expect(guard({ email: "first@example.com", phone: "0400000000" })).toBeNull();
    expect(guard({ email: "second@example.com", phone: "0400 000 000" })).toBe("duplicate_phone");
  });

  it("withholds identities that point to two existing clients", () => {
    const guard = createImportDuplicateGuard([
      { id: "lead-1", email: "one@example.com", phone: null },
      { id: "lead-2", email: null, phone: "0400000000" },
    ]);
    expect(guard({ email: "one@example.com", phone: "0400 000 000" })).toBe("conflicting_identity");
  });

  it("requires at least one durable identifier", () => {
    expect(createImportDuplicateGuard([])({ email: "", phone: "" })).toBe("missing_identity");
  });
});
