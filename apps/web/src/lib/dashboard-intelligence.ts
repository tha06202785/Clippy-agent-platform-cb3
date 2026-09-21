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

export type DashboardTask = {
  id: string;
  type?: string | null;
  title?: string | null;
  due_at?: string | null;
  lead_id?: string | null;
  listing_id?: string | null;
  lead_name?: string | null;
  property_address?: string | null;
};

export type DashboardRecommendation = {
  id: string;
  kind: "urgent_task" | "due_task" | "hot_lead" | "inspection_task" | "inbox";
  priority: "urgent" | "high" | "normal";
  title: string;
  detail: string;
  reason: string;
  action: string;
  href: string;
  task_id: string | null;
  due_at: string | null;
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
  const localMidnightAsUtc = Date.UTC(local.year, local.month - 1, local.day);

  // Recalculate once at the candidate midnight so daylight-saving transitions
  // use the offset that applied at the start of the reporting day.
  let todayMs =
    localMidnightAsUtc -
    timeZoneOffsetMs(new Date(localMidnightAsUtc), timeZone);
  todayMs = localMidnightAsUtc - timeZoneOffsetMs(new Date(todayMs), timeZone);

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

function taskRank(task: DashboardTask, nowMs: number) {
  const dueMs = task.due_at ? new Date(task.due_at).getTime() : Infinity;
  if (task.type === "urgent_follow_up") return 0;
  if (dueMs <= nowMs) return 1;
  if (["schedule_inspection", "schedule_showing"].includes(task.type || "")) {
    return 2;
  }
  if (dueMs <= nowMs + 24 * 60 * 60 * 1000) return 3;
  return 4;
}

function relativeDueLabel(dueAt: string | null | undefined, nowMs: number) {
  if (!dueAt) return "No due time";
  const dueMs = new Date(dueAt).getTime();
  if (!Number.isFinite(dueMs)) return "Due time unavailable";
  const difference = dueMs - nowMs;
  const absoluteMinutes = Math.max(
    1,
    Math.round(Math.abs(difference) / 60_000),
  );
  if (difference <= 0) {
    if (absoluteMinutes < 60) return `Overdue by ${absoluteMinutes}m`;
    const hours = Math.round(absoluteMinutes / 60);
    if (hours < 24) return `Overdue by ${hours}h`;
    const days = Math.round(hours / 24);
    return `Overdue by ${days}d`;
  }
  if (absoluteMinutes < 60) return `Due in ${absoluteMinutes}m`;
  const hours = Math.round(absoluteMinutes / 60);
  if (hours < 24) return `Due in ${hours}h`;
  const days = Math.round(hours / 24);
  return `Due in ${days}d`;
}

function taskHref(task: DashboardTask) {
  const params = [
    task.lead_id ? `lead_id=${encodeURIComponent(task.lead_id)}` : "",
    task.listing_id ? `listing_id=${encodeURIComponent(task.listing_id)}` : "",
  ].filter(Boolean);
  return params.length ? `/copilot?${params.join("&")}` : "/deals";
}

export function buildDashboardRecommendations(input: {
  tasks: DashboardTask[];
  hotLeads: DashboardLead[];
  newLeadsToday: number;
  now?: Date;
}): DashboardRecommendation[] {
  const recommendations: DashboardRecommendation[] = [];
  const nowMs = (input.now || new Date()).getTime();

  const tasks = [...input.tasks].sort((left, right) => {
    const rankDifference = taskRank(left, nowMs) - taskRank(right, nowMs);
    if (rankDifference !== 0) return rankDifference;
    const leftDue = left.due_at ? new Date(left.due_at).getTime() : Infinity;
    const rightDue = right.due_at ? new Date(right.due_at).getTime() : Infinity;
    return leftDue - rightDue;
  });

  for (const task of tasks.slice(0, 4)) {
    const rank = taskRank(task, nowMs);
    const isInspection = ["schedule_inspection", "schedule_showing"].includes(
      task.type || "",
    );
    const context = [task.lead_name, task.property_address].filter(Boolean);
    recommendations.push({
      id: `task:${task.id}`,
      kind:
        task.type === "urgent_follow_up"
          ? "urgent_task"
          : isInspection
            ? "inspection_task"
            : "due_task",
      priority: rank <= 1 ? "urgent" : rank <= 3 ? "high" : "normal",
      title:
        task.title?.trim() ||
        (isInspection ? "Prepare inspection" : "Complete follow-up"),
      detail: [...context, relativeDueLabel(task.due_at, nowMs)].join(" · "),
      reason:
        task.type === "urgent_follow_up"
          ? "Urgent follow-up"
          : rank === 1
            ? "Overdue commitment"
            : isInspection
              ? "Inspection preparation"
              : "Scheduled follow-up",
      action: isInspection ? "Prepare inspection" : "Draft follow-up",
      href: taskHref(task),
      task_id: task.id,
      due_at: task.due_at || null,
    });
  }

  const highestIntentLead = [...input.hotLeads].sort(
    (left, right) => (right.ai_score || 0) - (left.ai_score || 0),
  )[0];
  const taskLeadIds = new Set(
    tasks.map((task) => task.lead_id).filter(Boolean),
  );
  if (
    highestIntentLead &&
    recommendations.length < 5 &&
    !taskLeadIds.has(highestIntentLead.id)
  ) {
    const leadName = highestIntentLead.full_name?.trim();
    recommendations.push({
      id: `lead:${highestIntentLead.id}`,
      kind: "hot_lead",
      priority: "high",
      title: leadName
        ? `Contact ${leadName}`
        : `Contact ${input.hotLeads.length} hot ${
            input.hotLeads.length === 1 ? "lead" : "leads"
          }`,
      detail: leadName
        ? `Highest-scoring hot lead${highestIntentLead.ai_score ? ` · Intent score ${highestIntentLead.ai_score}` : ""}`
        : "These leads have the strongest current intent recorded.",
      reason: "High-intent opportunity",
      action: "Open client",
      href: `/clients/${highestIntentLead.id}`,
      task_id: null,
      due_at: null,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "inbox:review",
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
      reason: "Keep the pipeline moving",
      task_id: null,
      due_at: null,
    });
  }

  return recommendations.slice(0, 5);
}
