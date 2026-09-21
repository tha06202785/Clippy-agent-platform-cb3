import { NextResponse } from "next/server";
import {
  buildDashboardRecommendations,
  calculateMessagePerformance,
  getDashboardWindow,
  type DashboardLead,
  type DashboardMessage,
  type DashboardTask,
} from "@/lib/dashboard-intelligence";
import { createClient } from "@/lib/supabase/server";
import { isMessageVisible } from "@/lib/conversations/message-visibility";
import { canViewTeamActivity } from "@/lib/team-access";

export const dynamic = "force-dynamic";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requireResult(
  label: string,
  result: { error?: { message?: string } | null },
) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message || "query failed"}`);
  }
}

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  const json = (body: unknown, init?: ResponseInit) => {
    const durationMs = Date.now() - startedAt;
    const response = NextResponse.json(body, init);
    response.headers.set("Server-Timing", `dashboard;dur=${durationMs}`);
    console.log(
      JSON.stringify({
        level: "info",
        message: "Principal dashboard completed",
        route: "/api/principal/dashboard",
        request_id: requestId,
        status: init?.status || 200,
        duration_ms: durationMs,
        vercel_region: process.env.VERCEL_REGION || null,
      }),
    );
    return response;
  };

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return json(
      { error: "Dashboard data is unavailable in this environment" },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_org_roles")
      .select("org_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership?.org_id) {
      return json(
        { error: "No organisation membership found" },
        { status: 403 },
      );
    }

    if (!canViewTeamActivity(membership.role)) {
      return json({ error: "Manager access required" }, { status: 403 });
    }

    const orgId = membership.org_id;
    const reportingWindow = getDashboardWindow();
    const todayIso = reportingWindow.today.toISOString();
    const weekIso = reportingWindow.week.toISOString();
    const nowIso = reportingWindow.now.toISOString();

    const [
      profileResult,
      orgResult,
      todayMessagesResult,
      todayDeliveriesResult,
      todayLeadsResult,
      hotLeadsResult,
      warmLeadsCountResult,
      totalLeadsCountResult,
      weekLeadsCountResult,
      pendingTasksResult,
      activityResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("orgs")
        .select("id, name, timezone")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("conversation_id, direction_in_out, created_at, raw_json")
        .eq("org_id", orgId)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: true })
        .limit(1000),
      supabase
        .from("message_deliveries")
        .select(
          "id, direction, status, provider_message_id, sent_at, delivered_at, created_at",
        )
        .eq("org_id", orgId)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("leads")
        .select("id, full_name, stage, ai_score, created_at, last_activity_at")
        .eq("org_id", orgId)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("leads")
        .select("id, full_name, stage, ai_score, created_at, last_activity_at")
        .eq("org_id", orgId)
        .eq("stage", "hot")
        .order("ai_score", { ascending: false })
        .limit(20),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("stage", "warm"),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", weekIso),
      supabase
        .from("tasks")
        .select(
          "id,type,title,due_at,status,lead_id,listing_id,leads(id,full_name),listings(id,address)",
        )
        .eq("org_id", orgId)
        .eq("status", "pending")
        .order("due_at", { ascending: true })
        .limit(200),
      supabase
        .from("clippy_activity_log")
        .select(
          "id, action, category, title, description, impact_summary, completed_at",
        )
        .eq("org_id", orgId)
        .not("completed_at", "is", null)
        .gte("completed_at", todayIso)
        .order("completed_at", { ascending: false })
        .limit(8),
    ]);

    const coreResults: Array<
      [string, { error?: { message?: string } | null }]
    > = [
      ["Profile", profileResult],
      ["Organisation", orgResult],
      ["Messages", todayMessagesResult],
      ["Message deliveries", todayDeliveriesResult],
      ["New leads", todayLeadsResult],
      ["Hot leads", hotLeadsResult],
      ["Warm leads", warmLeadsCountResult],
      ["Total leads", totalLeadsCountResult],
      ["Weekly leads", weekLeadsCountResult],
      ["Pending tasks", pendingTasksResult],
    ];
    for (const [label, result] of coreResults) requireResult(label, result);

    const messages = (todayMessagesResult.data || [])
      .filter(isMessageVisible)
      .map((message) => ({
        conversation_id: message.conversation_id,
        role: message.direction_in_out === "in" ? "lead" : "agent",
        created_at: message.created_at,
      })) as DashboardMessage[];
    const performance = calculateMessagePerformance(messages);
    const hotLeads = (hotLeadsResult.data || []) as DashboardLead[];
    const pendingTasks = (pendingTasksResult.data || []).map((task) => {
      const lead = firstRelated(task.leads);
      const listing = firstRelated(task.listings);
      return {
        id: task.id,
        type: task.type,
        title: task.title,
        due_at: task.due_at,
        lead_id: task.lead_id,
        listing_id: task.listing_id,
        lead_name: lead?.full_name || null,
        property_address: listing?.address || null,
      } satisfies DashboardTask;
    });
    const urgentTasks = pendingTasks.filter(
      (task) => task.type === "urgent_follow_up",
    ).length;
    const dueTasks = pendingTasks.filter(
      (task) =>
        task.due_at &&
        new Date(task.due_at).getTime() <= reportingWindow.now.getTime(),
    ).length;
    const pendingInspectionTasks = pendingTasks.filter((task) =>
      ["schedule_inspection", "schedule_showing"].includes(task.type || ""),
    ).length;
    const newLeadsToday = todayLeadsResult.data?.length || 0;
    const activityAvailable = !activityResult.error;
    const activity = activityAvailable ? activityResult.data || [] : null;

    if (activityResult.error) {
      console.warn("Dashboard activity evidence unavailable", {
        orgId,
        message: activityResult.error.message,
      });
    }

    const verifiedOutboundDeliveries = (
      todayDeliveriesResult.data || []
    ).filter(
      (delivery) =>
        ["out", "outbound"].includes(delivery.direction || "") &&
        ["sent", "delivered", "read"].includes(delivery.status || "") &&
        Boolean(
          delivery.provider_message_id ||
          delivery.sent_at ||
          delivery.delivered_at,
        ),
    ).length;

    const verifiedActivityCount = activity?.length ?? null;
    const clippyState = !activityAvailable
      ? "evidence_unavailable"
      : verifiedActivityCount && verifiedActivityCount > 0
        ? "evidenced"
        : "no_evidence";

    const recommendations = buildDashboardRecommendations({
      tasks: pendingTasks,
      hotLeads,
      newLeadsToday,
      now: reportingWindow.now,
    });

    return json({
      generated_at: nowIso,
      reporting_time_zone: orgResult.data?.timezone || "Australia/Melbourne",
      viewer: {
        name:
          text(profileResult.data?.full_name) ??
          text(user.user_metadata?.full_name) ??
          text(user.user_metadata?.name) ??
          user.email?.split("@")[0] ??
          "Agent",
        role: membership.role ?? "agent",
        agency_name: orgResult.data?.name ?? null,
      },
      clippy: {
        state: clippyState,
        headline:
          clippyState === "evidence_unavailable"
            ? "Clippy’s activity evidence is unavailable"
            : clippyState === "evidenced"
              ? `${verifiedActivityCount} verified ${
                  verifiedActivityCount === 1 ? "action" : "actions"
                } completed today`
              : "No completed Clippy actions are recorded today",
        recommendations,
        completed: {
          verified_outbound_deliveries: verifiedOutboundDeliveries,
          outbound_messages_recorded: performance.outbound_messages_recorded,
          verified_activity_count: verifiedActivityCount,
          recent_activity: activity,
        },
      },
      now: {
        conversations_active: new Set(
          messages.map((message) => message.conversation_id),
        ).size,
        new_leads_today: newLeadsToday,
        urgent_tasks: urgentTasks,
        due_tasks: dueTasks,
        pending_tasks: pendingTasks.length,
        pending_inspection_tasks: pendingInspectionTasks,
      },
      week: {
        new_leads: weekLeadsCountResult.count ?? 0,
      },
      pipeline: {
        hot_leads: hotLeads.length,
        warm_leads: warmLeadsCountResult.count ?? 0,
        total_leads: totalLeadsCountResult.count ?? 0,
      },
      performance,
      data_quality: {
        activity_log_available: activityAvailable,
        delivery_evidence_available: true,
        message_scope: "organisation_id",
        inspection_bookings_available: false,
        rental_applications_available: false,
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Principal dashboard failed",
        route: "/api/principal/dashboard",
        request_id: requestId,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startedAt,
        vercel_region: process.env.VERCEL_REGION || null,
      }),
    );
    return json(
      { error: "Unable to load today’s operations" },
      { status: 500 },
    );
  }
}
