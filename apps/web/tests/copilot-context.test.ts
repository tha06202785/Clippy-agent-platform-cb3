import { describe, expect, it } from "vitest";
import {
  buildFollowUpCopilotHref,
  resolveInitialCopilotContextItem,
  type CopilotContextItem,
} from "@/lib/copilot-context";

const items: CopilotContextItem[] = [
  {
    key: "conversation:thread-1",
    kind: "conversation",
    label: "Taylor Client",
    description: "1 Main Street · email",
    context: {
      leadId: "client-1",
      listingId: "property-1",
      enquiryId: "enquiry-1",
      conversationId: "thread-1",
    },
  },
  {
    key: "enquiry:enquiry-1",
    kind: "enquiry",
    label: "Taylor Client",
    description: "1 Main Street · active enquiry",
    context: {
      leadId: "client-1",
      listingId: "property-1",
      enquiryId: "enquiry-1",
    },
  },
  {
    key: "client:client-1",
    kind: "client",
    label: "Taylor Client",
    description: "Client record",
    context: { leadId: "client-1" },
  },
  {
    key: "property:property-1",
    kind: "property",
    label: "1 Main Street",
    description: "Property record",
    context: { listingId: "property-1" },
  },
];

describe("Copilot initial working context", () => {
  it("keeps a client-only link at client scope", () => {
    expect(
      resolveInitialCopilotContextItem(items, { leadId: "client-1" })?.key,
    ).toBe("client:client-1");
  });

  it("keeps an enquiry link distinct from a conversation sharing that enquiry", () => {
    expect(
      resolveInitialCopilotContextItem(items, {
        leadId: "client-1",
        listingId: "property-1",
        enquiryId: "enquiry-1",
      })?.key,
    ).toBe("enquiry:enquiry-1");
  });

  it("uses the exact conversation when one is selected", () => {
    expect(
      resolveInitialCopilotContextItem(items, {
        conversationId: "thread-1",
      })?.key,
    ).toBe("conversation:thread-1");
  });

  it("prefers the exact conversation for a follow-up launch", () => {
    expect(
      resolveInitialCopilotContextItem(
        items,
        { leadId: "client-1", listingId: "property-1" },
        { preferConversation: true },
      )?.key,
    ).toBe("conversation:thread-1");
  });

  it("builds an auto-draft launch with its source task", () => {
    const href = buildFollowUpCopilotHref({
      taskId: "task-1",
      leadId: "client-1",
      listingId: "property-1",
    });
    const url = new URL(href, "https://useclippy.com");

    expect(url.pathname).toBe("/copilot");
    expect(url.searchParams.get("launch")).toBe("follow_up");
    expect(url.searchParams.get("task_id")).toBe("task-1");
    expect(url.searchParams.get("lead_id")).toBe("client-1");
    expect(url.searchParams.get("listing_id")).toBe("property-1");
    expect(url.searchParams.get("prompt")).toContain(
      "Draft a personalised follow-up",
    );
  });
});
