import { describe, expect, it } from "vitest";
import {
  addMinutesToLocalDateTime,
  createInspectionSlotSchema,
  updateInspectionSlotSchema,
} from "@/lib/validation";

const validSlot = {
  listing_id: "81aff2ef-e74b-439e-9b8e-f44185456801",
  starts_at: "2026-08-22T01:30:00.000Z",
  ends_at: "2026-08-22T02:00:00.000Z",
  capacity: 10,
  inspection_type: "open_home" as const,
  timezone: "Australia/Melbourne",
  location_notes: null,
};

describe("inspection slot validation", () => {
  it("accepts a thirty-minute inspection slot", () => {
    expect(createInspectionSlotSchema.safeParse(validSlot).success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = createInspectionSlotSchema.safeParse({
      ...validSlot,
      ends_at: "2026-08-22T01:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe(
        "End time must be after the start time",
      );
  });

  it("rejects an accidental multi-day inspection slot", () => {
    const result = createInspectionSlotSchema.safeParse({
      ...validSlot,
      ends_at: "2026-08-30T01:30:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe(
        "An inspection slot cannot be longer than 24 hours",
      );
  });

  it("automatically creates a thirty-minute local end time", () => {
    expect(addMinutesToLocalDateTime("2026-08-22T11:30", 30)).toBe(
      "2026-08-22T12:00",
    );
  });

  it("only permits supported status updates", () => {
    expect(
      updateInspectionSlotSchema.safeParse({ status: "cancelled" }).success,
    ).toBe(true);
    expect(
      updateInspectionSlotSchema.safeParse({
        status: "completed",
        org_id: "other",
      }).success,
    ).toBe(false);
  });
});
