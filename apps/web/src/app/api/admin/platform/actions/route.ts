import { NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/lib/admin-access";
import {
  isTrustedPlatformActionOrigin,
  platformActionSchema,
} from "@/lib/platform-actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedPlatformActionOrigin(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const context = await getPlatformAdminContext();
  if (context.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (context.status === "forbidden") {
    return NextResponse.json(
      { error: "Platform administrator access required" },
      { status: 403 },
    );
  }
  if (context.status === "unavailable") {
    return NextResponse.json(
      { error: "Platform administration is not configured" },
      { status: 503 },
    );
  }

  const parsed = platformActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid action", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { admin, user } = context;
  const input = parsed.data;
  const targetType = input.action.includes("account")
    ? "organisation"
    : input.action.includes("communication")
      ? "scheduled_communication"
      : "integration";

  const before = await loadTarget(admin, input.action, input.orgId, input.targetId);
  if (before.error) {
    return NextResponse.json({ error: before.error }, { status: 404 });
  }

  const audit = await admin
    .from("platform_admin_audit_log")
    .insert({
      actor_user_id: user.id,
      actor_email: user.email || null,
      action: input.action,
      target_org_id: input.orgId,
      target_type: targetType,
      target_id: input.targetId || input.orgId,
      reason: input.reason,
      before_state: before.data,
      outcome: "started",
    })
    .select("id")
    .single();

  if (audit.error || !audit.data) {
    return NextResponse.json(
      { error: "The action was not run because its audit record could not be created" },
      { status: 503 },
    );
  }

  const result = await applyAction(
    admin,
    input.action,
    input.orgId,
    input.targetId,
    user.id,
    input.reason,
  );

  await admin
    .from("platform_admin_audit_log")
    .update({
      outcome: result.error ? "failed" : "completed",
      after_state: result.data,
      error_message: result.error || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", audit.data.id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, auditId: audit.data.id, result: result.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function loadTarget(
  admin: any,
  action: string,
  orgId: string,
  targetId?: string,
) {
  const table = action.includes("account")
    ? "orgs"
    : action.includes("communication")
      ? "scheduled_communications"
      : "integrations";
  const columns = action.includes("account")
    ? "id,name,platform_status,platform_suspended_at,platform_suspended_by,platform_suspension_reason"
    : action.includes("communication")
      ? "id,org_id,type,channel,scheduled_for,status,attempt_count,max_attempts,last_error"
      : "id,org_id,provider,status,connected_at,updated_at";
  let query = admin.from(table).select(columns);
  query = action.includes("account")
    ? query.eq("id", orgId)
    : query.eq("id", targetId).eq("org_id", orgId);
  const result = await query.maybeSingle();
  return result.error || !result.data
    ? { error: result.error?.message || "Target not found", data: null }
    : { error: null, data: result.data };
}

async function applyAction(
  admin: any,
  action: string,
  orgId: string,
  targetId: string | undefined,
  actorId: string,
  reason: string,
) {
  let query;
  if (action === "suspend_account") {
    query = admin
      .from("orgs")
      .update({
        platform_status: "suspended",
        platform_suspended_at: new Date().toISOString(),
        platform_suspended_by: actorId,
        platform_suspension_reason: reason,
      })
      .eq("id", orgId);
  } else if (action === "resume_account") {
    query = admin
      .from("orgs")
      .update({
        platform_status: "active",
        platform_suspended_at: null,
        platform_suspended_by: null,
        platform_suspension_reason: null,
      })
      .eq("id", orgId);
  } else if (action === "retry_communication") {
    query = admin
      .from("scheduled_communications")
      .update({
        status: "scheduled",
        scheduled_for: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId)
      .eq("org_id", orgId)
      .in("status", ["failed", "cancelled"]);
  } else {
    query = admin
      .from("integrations")
      .update({
        status: "disconnected",
        credentials_encrypted: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId)
      .eq("org_id", orgId);
  }

  const safeColumns = action.includes("account")
    ? "id,name,platform_status,platform_suspended_at,platform_suspended_by,platform_suspension_reason"
    : action.includes("communication")
      ? "id,org_id,type,channel,scheduled_for,status,attempt_count,max_attempts,last_error"
      : "id,org_id,provider,status,connected_at,updated_at";
  const result = await query.select(safeColumns).maybeSingle();
  if (result.error) return { error: result.error.message, data: null };
  if (!result.data) return { error: "The target changed and the action was not applied", data: null };
  return { error: null, data: result.data };
}
