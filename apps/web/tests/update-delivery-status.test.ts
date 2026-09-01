import { describe, expect, it, vi } from "vitest";
import { normaliseReceiptTime } from "@/lib/conversations/update-delivery-status";

describe("delivery and read receipt timestamps", () => {
  it("accepts Meta millisecond watermarks without multiplying them again", () => {
    expect(normaliseReceiptTime(1_787_958_923_000)).toBe(
      "2026-08-28T23:15:23.000Z",
    );
    expect(normaliseReceiptTime("1787958923000")).toBe(
      "2026-08-28T23:15:23.000Z",
    );
  });

  it("still accepts providers that send Unix seconds", () => {
    expect(normaliseReceiptTime(1_787_958_923)).toBe(
      "2026-08-28T23:15:23.000Z",
    );
  });

  it("falls back safely for invalid values", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T02:30:00.000Z"));
    expect(normaliseReceiptTime("not-a-timestamp")).toBe(
      "2026-09-01T02:30:00.000Z",
    );
    vi.useRealTimers();
  });
});
