export type CopilotContextSelection = {
  leadId?: string;
  listingId?: string;
  enquiryId?: string;
  conversationId?: string;
  calendarEventId?: string;
  calendarSource?: "google" | "inspection";
};

export type CopilotContextItem = {
  key: string;
  kind: "conversation" | "enquiry" | "client" | "property" | "calendar";
  label: string;
  description: string;
  context: CopilotContextSelection;
};

type PrimaryContextKey =
  "conversationId" | "enquiryId" | "calendarEventId" | "leadId" | "listingId";

export function resolveInitialCopilotContextItem(
  items: CopilotContextItem[],
  initial: CopilotContextSelection,
  options: { preferConversation?: boolean } = {},
) {
  if (options.preferConversation) {
    const matchesSelectedRecords = (item: CopilotContextItem) => {
      if (initial.leadId && item.context.leadId !== initial.leadId)
        return false;
      if (initial.listingId && item.context.listingId !== initial.listingId) {
        return false;
      }
      return Boolean(initial.leadId || initial.listingId);
    };
    const conversationalContext = items.find(
      (item) => item.kind === "conversation" && matchesSelectedRecords(item),
    );
    if (conversationalContext) return conversationalContext;

    const enquiryContext = items.find(
      (item) => item.kind === "enquiry" && matchesSelectedRecords(item),
    );
    if (enquiryContext) return enquiryContext;
  }

  const priorities: PrimaryContextKey[] = [
    "conversationId",
    "enquiryId",
    "calendarEventId",
    "leadId",
    "listingId",
  ];
  const primary = priorities.find((key) => initial[key]);
  if (!primary) return null;

  const preferredKind: Record<PrimaryContextKey, CopilotContextItem["kind"]> = {
    conversationId: "conversation",
    enquiryId: "enquiry",
    calendarEventId: "calendar",
    leadId: "client",
    listingId: "property",
  };

  return (
    items.find((item) => {
      if (item.kind !== preferredKind[primary]) return false;
      if (item.context[primary] !== initial[primary]) return false;
      if (
        primary === "calendarEventId" &&
        initial.calendarSource &&
        item.context.calendarSource !== initial.calendarSource
      ) {
        return false;
      }
      return true;
    }) ?? null
  );
}

export function buildFollowUpCopilotHref({
  taskId,
  leadId,
  listingId,
}: {
  taskId?: string | null;
  leadId?: string | null;
  listingId?: string | null;
}) {
  const params = new URLSearchParams({
    launch: "follow_up",
    prompt:
      "Draft a personalised follow-up using the selected client's latest activity and the most appropriate available channel. Do not invent missing details.",
  });
  if (taskId) params.set("task_id", taskId);
  if (leadId) params.set("lead_id", leadId);
  if (listingId) params.set("listing_id", listingId);
  return `/copilot?${params.toString()}`;
}
