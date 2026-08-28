import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildFacebookQualificationReply,
  containsMessagingOptOut,
  extractSharedContactDetails,
  isSensitivePropertyMessage,
  verifyFacebookWebhookSignature,
} from "@/lib/facebook-enquiry-automation";

describe("Facebook enquiry automation safety", () => {
  it("extracts contact details only when the client actually shares them", () => {
    expect(
      extractSharedContactDetails(
        "My name is James Smith, call me on 0400 123 456 or james@example.com",
      ),
    ).toEqual({
      name: "James Smith",
      phone: "61400123456",
      email: "james@example.com",
    });
    expect(
      extractSharedContactDetails("I need a 4 bed home under $900k"),
    ).toEqual({ name: null, phone: null, email: null });
  });

  it("honours opt-outs and flags consequential topics for review", () => {
    expect(containsMessagingOptOut("Please do not contact me again")).toBe(
      true,
    );
    expect(containsMessagingOptOut("Please contact me tomorrow")).toBe(false);
    expect(
      isSensitivePropertyMessage("What is the lowest price they will accept?"),
    ).toBe(true);
    expect(isSensitivePropertyMessage("Do you have a four bedroom home?")).toBe(
      false,
    );
  });

  it("asks permission-based contact questions and keeps Messenger available", () => {
    const first = buildFacebookQualificationReply({
      agentName: "Teddy Thamel",
      automatedReplyCount: 0,
      hasContactDetails: false,
    });
    expect(first).toContain(
      "If you’d like Teddy Thamel to contact you directly",
    );
    expect(first).toContain("continue here on Messenger if you prefer");
    expect(first).toContain("Kind regards,\nTeddy Thamel");
  });

  it("validates Meta webhook signatures without exposing the app secret", () => {
    const rawBody = JSON.stringify({ object: "page", entry: [] });
    const appSecret = "test-secret";
    const signature = `sha256=${createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex")}`;

    expect(
      verifyFacebookWebhookSignature({ rawBody, signature, appSecret }),
    ).toBe(true);
    expect(
      verifyFacebookWebhookSignature({
        rawBody: `${rawBody}changed`,
        signature,
        appSecret,
      }),
    ).toBe(false);
    expect(
      verifyFacebookWebhookSignature({
        rawBody,
        signature: null,
        appSecret,
      }),
    ).toBe(false);
  });
});
