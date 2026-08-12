import { describe, expect, it } from "vitest";
import {
  calendarEventToKnowledge,
  extractGmailText,
  gmailMessageToKnowledge,
  extractLeadName,
  extractLeadPhone,
  extractPropertyAddress,
  isLikelyRealEstateLead,
  stripQuotedReply,
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

  it("keeps only the new reply and removes quoted Gmail history", () => {
    const body = [
      "Thanks Teddy. Saturday at 11 am works for me.",
      "",
      "On Wed, 12 Aug 2026 at 9:03 am, Teddy Thamel <agent@example.com> wrote:",
      "> Hi James,",
      "> I’ll check the inspection options.",
    ].join("\n");
    expect(stripQuotedReply(body)).toBe(
      "Thanks Teddy. Saturday at 11 am works for me.",
    );
  });

  it("uses a client name explicitly supplied in the enquiry", () => {
    expect(
      extractLeadName(
        "Hi, I’m James Taylor. I’m interested in 12 Test Street.",
        "ira tha",
      ),
    ).toBe("James Taylor");
  });

  it("extracts the client phone and property address from an enquiry", () => {
    const body =
      "Hi, I’m James Taylor. I’m interested in 12 Test Street and would like an inspection this Saturday. Please contact me on 0412 345 678.";
    expect(extractLeadPhone(body)).toBe("0412 345 678");
    expect(extractPropertyAddress(body)).toBe("12 Test Street");
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
    [
      "Your receipt",
      "Thanks for your payment. View your receipt and unsubscribe.",
      "no-reply@shop.test",
    ],
    [
      "Security alert",
      "A new device signed into your account.",
      "alerts@example.com",
    ],
    [
      "Weekly newsletter",
      "Here is this week's market newsletter. Unsubscribe here.",
      "news@example.com",
    ],
    ["Lunch tomorrow", "Are we still meeting at 12?", "friend@example.com"],
  ])("does not treat unrelated Gmail as a lead: %s", (subject, body, from) => {
    const item = gmailMessageToKnowledge({
      id: subject,
      threadId: subject,
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "Subject", value: subject },
          { name: "From", value: from },
        ],
        body: { data: encode(body) },
      },
    });
    expect(item && isLikelyRealEstateLead(item)).toBe(false);
  });

  it("rejects link-heavy marketing issues even when they mention property", () => {
    const item = gmailMessageToKnowledge({
      id: "chickpea-114",
      threadId: "chickpea-114",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "Subject", value: "The Chickpea Papers Issue #114" },
          { name: "From", value: "Lean with Plants <info@chelseamae.com>" },
        ],
        body: {
          data: encode(
            "Read our property story https://example.com/1 https://example.com/2 https://example.com/3",
          ),
        },
      },
    });
    expect(item && isLikelyRealEstateLead(item)).toBe(false);
  });

  it("accepts a trusted portal property enquiry from an automated sender", () => {
    const item = gmailMessageToKnowledge({
      id: "portal-enquiry",
      threadId: "portal-enquiry",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "Subject", value: "New buyer enquiry" },
          { name: "From", value: "no-reply@realestate.com.au" },
        ],
        body: {
          data: encode("Buyer enquiry for the property at 10 Collins Street"),
        },
      },
    });
    expect(item && isLikelyRealEstateLead(item)).toBe(true);
  });

  it("accepts an inspection confirmation follow-up with an address subject", () => {
    const item = gmailMessageToKnowledge({
      id: "inspection-confirmation-follow-up",
      threadId: "inspection-confirmation-follow-up",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "Subject", value: "12 twat street" },
          { name: "From", value: "ira tha <ira@example.com>" },
        ],
        body: {
          data: encode(
            "Hi\nI didn’t get the inspection confirmation yet",
          ),
        },
      },
    });

    expect(item && isLikelyRealEstateLead(item)).toBe(true);
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
