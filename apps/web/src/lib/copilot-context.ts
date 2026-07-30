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
) {
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
