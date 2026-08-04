import { describe, expect, it } from "vitest";
import { createListingSchema } from "@/lib/validation";

describe("pipeline listing validation", () => {
  it("accepts a deal payload backed by the listings model", () => {
    const result = createListingSchema.safeParse({
      address: "123 Example Street",
      price: "750000",
      bedrooms: 3,
      bathrooms: 2,
      stage: "qualified",
      status: "active",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown pipeline stage", () => {
    const result = createListingSchema.safeParse({
      address: "123 Example Street",
      stage: "not-a-real-stage",
    });

    expect(result.success).toBe(false);
  });
});
