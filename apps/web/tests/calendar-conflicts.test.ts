import { describe, expect, it } from "vitest";
import { findGoogleCalendarConflicts } from "@/lib/calendar-conflicts";

describe("Google Calendar conflict checks", () => {
  const documents = [{
    id: "event-1",
    title: "Vendor meeting",
    source_metadata: {
      starts_at: "2026-08-15T01:15:00.000Z",
      ends_at: "2026-08-15T01:45:00.000Z",
    },
  }];

  it("finds an overlapping indexed Google event", () => {
    expect(findGoogleCalendarConflicts(
      documents,
      "2026-08-15T01:30:00.000Z",
      "2026-08-15T02:00:00.000Z",
    )).toEqual([{
      id: "event-1",
      title: "Vendor meeting",
      startsAt: "2026-08-15T01:15:00.000Z",
      endsAt: "2026-08-15T01:45:00.000Z",
      source: "google",
    }]);
  });

  it("ignores adjacent and malformed events", () => {
    expect(findGoogleCalendarConflicts([
      ...documents,
      { id: "bad", title: "Bad", source_metadata: { starts_at: "nope" } },
    ], "2026-08-15T01:45:00.000Z", "2026-08-15T02:15:00.000Z")).toEqual([]);
  });
});
