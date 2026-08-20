import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMessageVisible } from "@/lib/conversations/message-visibility";

export const dynamic = "force-dynamic";

type ActionPriority = "urgent" | "high" | "normal";

type DailyAction = {
  id: string;
  priority: ActionPriority;
  type: "follow_up" | "hot_lead" | "unread" | "inspection";
  title: string;
  reason: string;
  href: string;
  cta: string;
  due_at: string | null;
};

function requireResult<T>(
  label: string,
  result: {
    data: T | null;
    error: { code?: string; message: string } | null;
  },
): T {
  if (result.error) {
    throw new Error(`${label}: ${result.error.code || result.error.message}`);
  }
  return result.data as T;
}

function related<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data?.org_id) {
      return NextResponse.json({ error: "No organisation" }, { status: 403 });
    }

    const orgId = membership.data.org_id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [
      conversationsResult,
      messagesResult,
      newLeadsResult,
      priorityLeadsResult,
      tasksResult,
      inspectionsResult,
      unreadResult,
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select("id")
        .eq("org_id", orgId)
        .gte("last_message_at", yesterday.toISOString())
        .lt("last_message_at", today.toISOString()),
      supabase
        .from("messages")
        .select("id,conversation_id,direction_in_out,raw_json")
        .eq("org_id", orgId)
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString()),
      supabase
        .from("leads")
        .select("id,full_name,stage,ai_score,source,created_at")
        .eq("org_id", orgId)
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("leads")
        .select("id,full_name,stage,ai_score,last_activity_at")
        .eq("org_id", orgId)
        .order("ai_score", { ascending: false, nullsFirst: false })
        .limit(50),
      supabase
        .from("tasks")
        .select("id,title,type,status,due_at,lead_id,listing_id")
        .eq("org_id", orgId)
        .eq("status", "pending")
        .lte("due_at", weekAhead.toISOString())
        .order("due_at", { ascending: true })
        .limit(100),
      supabase
        .from("inspection_bookings")
        .select(
          "id,lead_id,listing_id,booking_status,leads(id,full_name),listings(id,address),inspection_time_slots!inner(starts_at)",
        )
        .eq("org_id", orgId)
        .eq("booking_status", "confirmed")
        .gte("inspection_time_slots.starts_at", today.toISOString())
        .lt("inspection_time_slots.starts_at", tomorrow.toISOString())
        .order("starts_at", {
          referencedTable: "inspection_time_slots",
          ascending: true,
        })
        .limit(50),
      supabase
        .from("messages")
        .select("id,conversation_id,created_at,raw_json")
        .eq("org_id", orgId)
        .eq("direction_in_out", "in")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const conversations = requireResult<any[]>(
      "conversations",
      conversationsResult,
    );
    const messages = requireResult<any[]>("messages", messagesResult).filter(
      isMessageVisible,
    );
    const newLeads = requireResult<any[]>("new leads", newLeadsResult);
    const priorityLeads = requireResult<any[]>(
      "priority leads",
      priorityLeadsResult,
    ).filter(
      (lead) => lead.stage === "hot" || Number(lead.ai_score || 0) >= 80,
    );
    const tasks = requireResult<any[]>("tasks", tasksResult);
    const inspections = requireResult<any[]>("inspections", inspectionsResult);
    const unreadMessages = requireResult<any[]>(
      "unread messages",
      unreadResult,
    ).filter(isMessageVisible);

    const conversationIds = [
      ...new Set(unreadMessages.map((message) => message.conversation_id)),
    ].filter(Boolean);
    const conversationContextResult = conversationIds.length
      ? await supabase
          .from("conversations")
          .select("id,lead_id,listing_id")
          .eq("org_id", orgId)
          .in("id", conversationIds)
      : { data: [], error: null };
    const conversationContexts = requireResult<any[]>(
      "unread conversation context",
      conversationContextResult,
    );
    const contextByConversation = new Map(
      conversationContexts.map((conversation) => [
        conversation.id,
        conversation,
      ]),
    );

    const actions: DailyAction[] = [];
    for (const task of tasks) {
      const overdue = new Date(task.due_at).getTime() < now.getTime();
      actions.push({
        id: `task-${task.id}`,
        priority: overdue ? "urgent" : "normal",
        type: "follow_up",
        title: task.title || "Client follow-up",
        reason: overdue
          ? `Overdue since ${new Date(task.due_at).toLocaleString("en-AU")}`
          : `Due ${new Date(task.due_at).toLocaleString("en-AU")}`,
        href: task.lead_id
          ? `/clients/${task.lead_id}`
          : task.listing_id
            ? `/property/${task.listing_id}`
            : "/calendar",
        cta: "Review follow-up",
        due_at: task.due_at,
      });
    }

    const taskLeadIds = new Set(
      tasks.map((task) => task.lead_id).filter(Boolean),
    );
    for (const lead of priorityLeads.slice(0, 10)) {
      if (taskLeadIds.has(lead.id)) continue;
      actions.push({
        id: `lead-${lead.id}`,
        priority: "high",
        type: "hot_lead",
        title: lead.full_name || "High-priority client",
        reason: `Hot client${lead.ai_score ? ` · AI score ${lead.ai_score}` : ""} has no pending follow-up`,
        href: `/clients/${lead.id}`,
        cta: "Open Client 360",
        due_at: null,
      });
    }

    const unreadByConversation = new Map<string, any>();
    for (const message of unreadMessages) {
      if (!unreadByConversation.has(message.conversation_id)) {
        unreadByConversation.set(message.conversation_id, message);
      }
    }
    for (const [conversationId, message] of unreadByConversation) {
      const context = contextByConversation.get(conversationId);
      actions.push({
        id: `unread-${conversationId}`,
        priority: "high",
        type: "unread",
        title: "Unread client message",
        reason: `Waiting since ${new Date(message.created_at).toLocaleString("en-AU")}`,
        href: context?.lead_id
          ? `/clients/${context.lead_id}`
          : context?.listing_id
            ? `/property/${context.listing_id}`
            : "/inbox",
        cta: "Review conversation",
        due_at: message.created_at,
      });
    }

    for (const booking of inspections) {
      const slot = related<any>(booking.inspection_time_slots);
      const lead = related<any>(booking.leads);
      const listing = related<any>(booking.listings);
      actions.push({
        id: `inspection-${booking.id}`,
        priority: "normal",
        type: "inspection",
        title: listing?.address || "Inspection today",
        reason: `${lead?.full_name || "Client"} · ${new Date(slot?.starts_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`,
        href: booking.listing_id
          ? `/property/${booking.listing_id}`
          : "/inspections",
        cta: "View inspection",
        due_at: slot?.starts_at || null,
      });
    }

    const priorityOrder: Record<ActionPriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
    };
    actions.sort(
      (left, right) =>
        priorityOrder[left.priority] - priorityOrder[right.priority] ||
        new Date(left.due_at || 0).getTime() -
          new Date(right.due_at || 0).getTime(),
    );

    const inbound = messages.filter(
      (message) => message.direction_in_out === "in",
    ).length;
    const outbound = messages.filter(
      (message) => message.direction_in_out === "out",
    ).length;
    const responseRate = inbound
      ? Math.min(100, Math.round((outbound / inbound) * 100))
      : 100;
    const urgentCount = actions.filter(
      (action) => action.priority === "urgent",
    ).length;
    const summary = urgentCount
      ? `${urgentCount} overdue action${urgentCount === 1 ? "" : "s"} should be handled first. Clippy has ordered the rest of today's work by urgency.`
      : actions.length
        ? `${actions.length} recommended action${actions.length === 1 ? "" : "s"} are ready. Start at the top and Clippy will keep the correct client and property context.`
        : "You are caught up. No urgent client actions are waiting right now.";

    return NextResponse.json(
      {
        date: now.toISOString(),
        summary,
        actions: actions.slice(0, 30),
        metrics: {
          conversations_handled: new Set(
            messages.map((message) => message.conversation_id),
          ).size,
          new_leads: newLeads.length,
          inspections_booked: inspections.length,
          hot_leads: priorityLeads.length,
          unread_messages: unreadMessages.length,
          overdue_followups: tasks.filter(
            (task) => new Date(task.due_at).getTime() < now.getTime(),
          ).length,
          response_rate: responseRate,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Briefing data unavailable", error);
    return NextResponse.json(
      {
        error:
          "Daily action plan is unavailable because its source data could not be verified.",
      },
      { status: 503 },
    );
  }
}
