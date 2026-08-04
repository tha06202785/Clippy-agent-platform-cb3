import { describe, expect, it } from "vitest";
import {
  buildDraftLaunchUrl,
  resolveDraftChannel,
  shouldCreateDraftAction,
  type ProposedDraftAction,
} from "@/lib/copilot-actions";

describe("Copilot draft actions", () => {
  it("keeps send requests inside the approval flow", () => {
    expect(shouldCreateDraftAction("Send Taylor a follow-up email")).toBe(true);
    expect(shouldCreateDraftAction("What is on my calendar?")).toBe(false);
    expect(shouldCreateDraftAction("Summarise the latest messages")).toBe(
      false,
    );
  });

  it("uses the requested available channel", () => {
    expect(
      resolveDraftChannel({
        message: "Text him the inspection address",
        conversationChannel: "email",
        email: "taylor@example.com",
        phone: "0412 345 678",
      }),
    ).toBe("sms");
  });

  it("falls back to copy when the requested contact detail is missing", () => {
    expect(
      resolveDraftChannel({
        message: "Email her a follow-up",
        email: null,
        phone: "0412 345 678",
      }),
    ).toBe("copy");
  });

  it("builds a native email handoff without claiming delivery", () => {
    const action: ProposedDraftAction = {
      id: "draft-1",
      type: "message_draft",
      channel: "email",
      title: "Email draft",
      subject: "Inspection follow-up",
      content: "Thanks for attending.",
      recipient: {
        name: "Taylor",
        email: "taylor@example.com",
        phone: null,
      },
      requiresApproval: true,
    };

    const url = buildDraftLaunchUrl(action);
    expect(url).toContain("mailto:taylor@example.com?");
    expect(url).toContain("subject=Inspection+follow-up");
    expect(url).toContain("body=Thanks+for+attending.");
  });
});
