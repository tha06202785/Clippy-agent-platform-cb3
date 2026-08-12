import { describe, expect, it } from "vitest";
import {
  buildDraftLaunchUrl,
  parseInspectionSlotRequest,
  parseInspectionSlotRequests,
  resolveDraftChannel,
  shouldCreateDraftAction,
  shouldCreateInspectionSlot,
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

describe("Copilot inspection slot actions", () => {
  const now = new Date("2026-08-12T00:00:00.000Z");

  it("recognises a request to create a slot", () => {
    expect(
      shouldCreateInspectionSlot(
        "Create an inspection time slot this Saturday at 11.30am",
      ),
    ).toBe(true);
    expect(shouldCreateInspectionSlot("What inspections are coming up?")).toBe(
      false,
    );
  });

  it("resolves a Melbourne weekday and creates a 30 minute window", () => {
    expect(
      parseInspectionSlotRequest(
        "Create an inspection slot this Saturday at 11.30am",
        now,
      ),
    ).toEqual({
      startsAt: "2026-08-15T01:30:00.000Z",
      endsAt: "2026-08-15T02:00:00.000Z",
    });
  });

  it("asks for a date instead of guessing", () => {
    expect(
      parseInspectionSlotRequest("Create a time slot at 11.30am", now),
    ).toEqual({ missing: "date" });
  });

  it("parses several inspection times on the same selected day", () => {
    expect(parseInspectionSlotRequests(
      "Create Saturday inspection slots at 10:00 am, 11:30 am and 2:00 pm",
      now,
    )).toEqual([
      { startsAt: "2026-08-15T00:00:00.000Z", endsAt: "2026-08-15T00:30:00.000Z" },
      { startsAt: "2026-08-15T01:30:00.000Z", endsAt: "2026-08-15T02:00:00.000Z" },
      { startsAt: "2026-08-15T04:00:00.000Z", endsAt: "2026-08-15T04:30:00.000Z" },
    ]);
  });

});
