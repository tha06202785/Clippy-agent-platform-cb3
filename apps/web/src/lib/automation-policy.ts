export type AutomationMode = "automatic" | "approval" | "off";

export type AutomationActionKey =
  | "client_import"
  | "client_record_updates"
  | "booking_confirmation"
  | "inspection_reminders"
  | "booking_link_reply"
  | "new_enquiry_reply"
  | "no_response_follow_up"
  | "appointment_changes"
  | "marketing_messages"
  | "negotiation_messages";

export const AUTOMATION_ACTIONS: Array<{
  key: AutomationActionKey;
  label: string;
  description: string;
  group: "Data" | "Appointments" | "Communication";
  recommended: AutomationMode;
}> = [
  {
    key: "client_import",
    label: "Import relevant enquiries",
    description: "Create or reuse a client when a relevant enquiry arrives.",
    group: "Data",
    recommended: "automatic",
  },
  {
    key: "client_record_updates",
    label: "Update client and enquiry records",
    description:
      "Save verified contact details, property interest and activity.",
    group: "Data",
    recommended: "automatic",
  },
  {
    key: "booking_confirmation",
    label: "Booking confirmations",
    description: "Send a factual confirmation after the client books a slot.",
    group: "Appointments",
    recommended: "automatic",
  },
  {
    key: "inspection_reminders",
    label: "Inspection reminders",
    description: "Send the approved 24-hour and 2-hour reminders.",
    group: "Appointments",
    recommended: "automatic",
  },
  {
    key: "appointment_changes",
    label: "Reschedule or cancel appointments",
    description: "Actions that change an existing client appointment.",
    group: "Appointments",
    recommended: "approval",
  },
  {
    key: "booking_link_reply",
    label: "Replies containing booking links",
    description: "Invite an enquirer to select a verified inspection slot.",
    group: "Communication",
    recommended: "approval",
  },
  {
    key: "new_enquiry_reply",
    label: "First reply to a new enquiry",
    description: "AI-written first responses across connected channels.",
    group: "Communication",
    recommended: "approval",
  },
  {
    key: "no_response_follow_up",
    label: "No-response follow-ups",
    description: "Follow up when a client has not replied.",
    group: "Communication",
    recommended: "approval",
  },
  {
    key: "marketing_messages",
    label: "Marketing messages",
    description: "Promotional or nurture communication to clients.",
    group: "Communication",
    recommended: "off",
  },
  {
    key: "negotiation_messages",
    label: "Price, offer or negotiation messages",
    description:
      "Financially sensitive communication remains human controlled.",
    group: "Communication",
    recommended: "off",
  },
];

export const DEFAULT_ACTION_MODES = Object.fromEntries(
  AUTOMATION_ACTIONS.map((action) => [action.key, action.recommended]),
) as Record<AutomationActionKey, AutomationMode>;

type AdminClient = any;

export type AutomationPolicy = {
  paused: boolean;
  modes: Record<AutomationActionKey, AutomationMode>;
  maxMessagesPerClientDay: number;
  minimumConfidence: number;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export async function getAutomationPolicy(
  admin: AdminClient,
  orgId: string,
): Promise<AutomationPolicy> {
  const { data } = await admin
    .from("automation_settings")
    .select(
      "ai_paused,action_modes,max_automated_messages_per_client_day,minimum_confidence,quiet_hours_start,quiet_hours_end",
    )
    .eq("org_id", orgId)
    .maybeSingle();
  const storedModes =
    data?.action_modes && typeof data.action_modes === "object"
      ? data.action_modes
      : {};
  const modes = { ...DEFAULT_ACTION_MODES };
  for (const action of AUTOMATION_ACTIONS) {
    const candidate = storedModes[action.key];
    if (["automatic", "approval", "off"].includes(candidate)) {
      modes[action.key] = candidate as AutomationMode;
    }
  }
  return {
    paused: Boolean(data?.ai_paused),
    modes,
    maxMessagesPerClientDay: data?.max_automated_messages_per_client_day || 4,
    minimumConfidence: Number(data?.minimum_confidence ?? 0.9),
    quietHoursStart: data?.quiet_hours_start || "20:00:00",
    quietHoursEnd: data?.quiet_hours_end || "08:00:00",
  };
}

export async function queueAutomationApproval({
  admin,
  orgId,
  actionKey,
  channel,
  recipient,
  content,
  subject,
  leadId,
  conversationId,
  bookingId,
  scheduledCommunicationId,
  confidence,
  reason,
  idempotencyKey,
}: {
  admin: AdminClient;
  orgId: string;
  actionKey: AutomationActionKey;
  channel: string;
  recipient: string;
  content: string;
  subject?: string | null;
  leadId?: string | null;
  conversationId?: string | null;
  bookingId?: string | null;
  scheduledCommunicationId?: string | null;
  confidence?: number | null;
  reason?: string | null;
  idempotencyKey: string;
}) {
  const { data, error } = await admin
    .from("automation_approvals")
    .upsert(
      {
        org_id: orgId,
        action_key: actionKey,
        channel,
        recipient,
        subject: subject || null,
        content,
        lead_id: leadId || null,
        conversation_id: conversationId || null,
        inspection_booking_id: bookingId || null,
        scheduled_communication_id: scheduledCommunicationId || null,
        confidence: confidence ?? null,
        reason: reason || null,
        status: "pending",
        idempotency_key: idempotencyKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    )
    .select("id,status")
    .maybeSingle();
  if (error) throw error;
  if (scheduledCommunicationId) {
    await admin
      .from("scheduled_communications")
      .update({
        status: "awaiting_approval",
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduledCommunicationId);
  }
  return data;
}
