import { describe, expect, it } from "vitest";
import {
  calendarEventToKnowledge,
  extractGmailText,
  gmailMessageToKnowledge,
} from "@/lib/integrations/google-sync";

const encode = (value: string) => Buffer.from(value).toString("base64url");

describe("Google knowledge sync", () => {
  it("prefers plain email text and excludes the duplicate HTML alternative", () => {
    const text = extractGmailText({
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: encode("Inspection at 2pm") } },
        {
          mimeType: "text/html",
          body: { data: encode("<p>Inspection at <b>2pm</b></p>") },
        },
      ],
    });

    expect(text).toBe("Inspection at 2pm");
  });

  it("converts Gmail metadata and body into a stable knowledge item", () => {
    const item = gmailMessageToKnowledge({
      id: "message-123",
      threadId: "thread-7",
      internalDate: "1785370000000",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "Subject", value: "Buyer enquiry" },
          { name: "From", value: "buyer@example.com" },
        ],
        body: { data: encode("Is Saturday inspection still available?") },
      },
    });

    expect(item).toMatchObject({
      externalId: "message-123",
      revision: "1785370000000",
      source: "email",
      title: "Buyer enquiry",
    });
    expect(item?.content).toContain("Saturday inspection");
  });

  it("converts active calendar events and ignores cancellations", () => {
    const active = calendarEventToKnowledge({
      id: "event-123",
      updated: "2026-07-30T00:00:00Z",
      summary: "Inspection – 10 Collins Street",
      start: { dateTime: "2026-08-01T14:00:00+10:00" },
      end: { dateTime: "2026-08-01T14:30:00+10:00" },
      attendees: [{ email: "buyer@example.com", responseStatus: "accepted" }],
    });

    expect(active).toMatchObject({
      externalId: "event-123",
      source: "calendar",
      title: "Inspection – 10 Collins Street",
    });
    expect(active?.content).toContain("buyer@example.com (accepted)");
    expect(
      calendarEventToKnowledge({ id: "cancelled", status: "cancelled" }),
    ).toBeNull();
  });
});
