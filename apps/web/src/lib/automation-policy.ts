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

export type AutomationDecision = {
  outcome: "automatic" | "approval" | "off";
  reason: string | null;
};

function melbourneDayStart(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  const offset = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")
    ?.value.replace("GMT", "");
  return new Date(
    `${value("year")}-${value("month")}-${value("day")}T00:00:00${offset || "+10:00"}`,
  ).toISOString();
}

export function isWithinQuietHours(
  now: Date,
  start: string,
  end: string,
) {
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const current = local.slice(0, 5);
  const quietStart = start.slice(0, 5);
  const quietEnd = end.slice(0, 5);
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd
    ? current >= quietStart && current < quietEnd
    : current >= quietStart || current < quietEnd;
}

export async function evaluateAutomationAction({
  admin,
  orgId,
  actionKey,
  leadId,
  confidence = 1,
  now = new Date(),
  sensitive = false,
}: {
  admin: AdminClient;
  orgId: string;
  actionKey: AutomationActionKey;
  leadId?: string | null;
  confidence?: number;
  now?: Date;
  sensitive?: boolean;
}): Promise<AutomationDecision> {
  const policy = await getAutomationPolicy(admin, orgId);
  const mode = policy.modes[actionKey];
  if (mode === "off") return { outcome: "off", reason: "This action is off" };
  if (policy.paused)
    return { outcome: "approval", reason: "Agency automation is paused" };
  if (mode === "approval")
    return {
      outcome: "approval",
      reason: "Agency requires approval for this communication",
    };
  if (sensitive)
    return {
      outcome: "approval",
      reason: "Sensitive client communication requires human review",
    };
  if (confidence < policy.minimumConfidence)
    return {
      outcome: "approval",
      reason: `Confidence ${Math.round(confidence * 100)}% is below the ${Math.round(policy.minimumConfidence * 100)}% minimum`,
    };
  if (
    isWithinQuietHours(now, policy.quietHoursStart, policy.quietHoursEnd)
  )
    return {
      outcome: "approval",
      reason: "This message falls within agency quiet hours",
    };
  if (leadId) {
    const { data: conversations } = await admin
      .from("conversations")
      .select("id")
      .eq("org_id", orgId)
      .eq("lead_id", leadId);
    const conversationIds = (conversations || []).map(
      (item: { id: string }) => item.id,
    );
    let count = 0;
    if (conversationIds.length) {
      const result = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("direction_in_out", "out")
        .gte("created_at", melbourneDayStart(now))
        .contains("raw_json", { automated: true })
        .in("conversation_id", conversationIds);
      count = result.count || 0;
    }
    if ((count || 0) >= policy.maxMessagesPerClientDay)
      return {
        outcome: "approval",
        reason: "This client has reached the daily automated-message limit",
      };
  }
  return { outcome: "automatic", reason: null };
}

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
