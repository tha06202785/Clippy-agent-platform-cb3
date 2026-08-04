export const CLIPPY_TIME_ZONE = "Australia/Melbourne";

export type DashboardMessage = {
  conversation_id: string;
  role: string;
  created_at: string;
  external_message_id?: string | null;
};

export type DashboardLead = {
  id: string;
  full_name?: string | null;
  stage?: string | null;
  ai_score?: number | null;
  created_at?: string | null;
  last_activity_at?: string | null;
};

export type DashboardRecommendation = {
  kind: "urgent_task" | "due_task" | "hot_lead" | "inspection_task" | "inbox";
  priority: "urgent" | "high" | "normal";
  title: string;
  detail: string;
  action: string;
  href: string;
};

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function getDashboardWindow(
  now = new Date(),
  timeZone = CLIPPY_TIME_ZONE,
) {
  const local = zonedParts(now, timeZone);
  const localMidnightAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
  );

  // Recalculate once at the candidate midnight so daylight-saving transitions
  // use the offset that applied at the start of the reporting day.
  let todayMs =
    localMidnightAsUtc -
    timeZoneOffsetMs(new Date(localMidnightAsUtc), timeZone);
  todayMs =
    localMidnightAsUtc - timeZoneOffsetMs(new Date(todayMs), timeZone);

  return {
    today: new Date(todayMs),
    week: new Date(todayMs - 7 * 24 * 60 * 60 * 1000),
    now,
  };
}

export function calculateMessagePerformance(messages: DashboardMessage[]) {
  const byConversation = new Map<string, DashboardMessage[]>();
  for (const message of messages) {
    const conversation = byConversation.get(message.conversation_id) || [];
    conversation.push(message);
    byConversation.set(message.conversation_id, conversation);
  }

  let inboundBursts = 0;
  let answeredBursts = 0;
  let totalResponseTimeMs = 0;

  for (const conversation of byConversation.values()) {
    conversation.sort(
      (left, right) =>
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime(),
    );

    let waitingSince: number | null = null;
    for (const message of conversation) {
      if (message.role === "lead") {
        if (waitingSince === null) {
          waitingSince = new Date(message.created_at).getTime();
          inboundBursts += 1;
        }
        continue;
      }

      if (
        waitingSince !== null &&
        (message.role === "ai" || message.role === "agent")
      ) {
        const responseTime =
          new Date(message.created_at).getTime() - waitingSince;
        if (responseTime >= 0) {
          answeredBursts += 1;
          totalResponseTimeMs += responseTime;
        }
        waitingSince = null;
      }
    }
  }

  const outboundMessagesRecorded = messages.filter(
    (message) => message.role === "ai" || message.role === "agent",
  ).length;
  const outboundMessagesWithExternalId = messages.filter(
    (message) =>
      (message.role === "ai" || message.role === "agent") &&
      Boolean(message.external_message_id?.trim()),
  ).length;

  return {
    inbound_bursts: inboundBursts,
    answered_bursts: answeredBursts,
    outbound_messages_recorded: outboundMessagesRecorded,
    outbound_messages_with_external_id: outboundMessagesWithExternalId,
    avg_response_time_seconds:
      answeredBursts > 0
        ? Math.round(totalResponseTimeMs / answeredBursts / 1000)
        : null,
    response_coverage_percent:
      inboundBursts > 0
        ? Math.round((answeredBursts / inboundBursts) * 100)
        : null,
  };
}

export function buildDashboardRecommendations(input: {
  urgentTasks: number;
  dueTasks: number;
  hotLeads: DashboardLead[];
  pendingInspectionTasks: number;
  newLeadsToday: number;
}): DashboardRecommendation[] {
  const recommendations: DashboardRecommendation[] = [];

  if (input.urgentTasks > 0) {
    recommendations.push({
      kind: "urgent_task",
      priority: "urgent",
      title: `Review ${input.urgentTasks} urgent ${
        input.urgentTasks === 1 ? "task" : "tasks"
      }`,
      detail:
        "These tasks are still pending and are explicitly marked as urgent follow-up work.",
      action: "Open opportunities",
      href: "/deals",
    });
  }

  if (input.dueTasks > 0) {
    recommendations.push({
      kind: "due_task",
      priority: "high",
      title: `Complete ${input.dueTasks} due ${
        input.dueTasks === 1 ? "task" : "tasks"
      }`,
      detail:
        "These tasks have reached their due time and are still recorded as pending.",
      action: "Open opportunities",
      href: "/deals",
    });
  }

  const highestIntentLead = [...input.hotLeads].sort(
    (left, right) => (right.ai_score || 0) - (left.ai_score || 0),
  )[0];
  if (highestIntentLead) {
    const leadName = highestIntentLead.full_name?.trim();
    recommendations.push({
      kind: "hot_lead",
      priority: "high",
      title: leadName
        ? `Contact ${leadName}`
        : `Contact ${input.hotLeads.length} hot ${
            input.hotLeads.length === 1 ? "lead" : "leads"
          }`,
      detail: leadName
        ? "This is the highest-scoring hot lead currently recorded."
        : "These leads have the strongest current intent recorded.",
      action: "Open opportunities",
      href: "/deals",
    });
  }

  if (
    recommendations.length < 3 &&
    input.pendingInspectionTasks > 0
  ) {
    recommendations.push({
      kind: "inspection_task",
      priority: "normal",
      title: `Prepare ${input.pendingInspectionTasks} ${
        input.pendingInspectionTasks === 1
          ? "inspection task"
          : "inspection tasks"
      }`,
      detail:
        "Inspection scheduling work is pending; this does not yet mean a booking is confirmed.",
      action: "Open opportunities",
      href: "/deals",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      kind: "inbox",
      priority: "normal",
      title:
        input.newLeadsToday > 0
          ? `Qualify ${input.newLeadsToday} new ${
              input.newLeadsToday === 1 ? "lead" : "leads"
            }`
          : "Review the conversation inbox",
      detail:
        input.newLeadsToday > 0
          ? "No urgent exception is waiting, so the next opportunity is today’s new enquiries."
          : "No urgent escalation, overdue follow-up or hot lead is currently recorded.",
      action: "View conversations",
      href: "/inbox",
    });
  }

  return recommendations.slice(0, 3);
}
