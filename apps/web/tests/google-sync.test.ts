import { describe, expect, it } from "vitest";
import {
  calendarEventToKnowledge,
  extractGmailText,
  gmailMessageToKnowledge,
  isLikelyRealEstateLead,
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
    expect(item && isLikelyRealEstateLead(item)).toBe(true);
  });

  it.each([
    ["Your receipt", "Thanks for your payment. View your receipt and unsubscribe.", "no-reply@shop.test"],
    ["Security alert", "A new device signed into your account.", "alerts@example.com"],
    ["Weekly newsletter", "Here is this week's market newsletter. Unsubscribe here.", "news@example.com"],
    ["Lunch tomorrow", "Are we still meeting at 12?", "friend@example.com"],
  ])("does not treat unrelated Gmail as a lead: %s", (subject, body, from) => {
    const item = gmailMessageToKnowledge({
      id: subject, threadId: subject, payload: { mimeType: "text/plain",
        headers: [{ name: "Subject", value: subject }, { name: "From", value: from }],
        body: { data: encode(body) } },
    });
    expect(item && isLikelyRealEstateLead(item)).toBe(false);
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
