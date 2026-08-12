import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTOMATION_ACTIONS,
  DEFAULT_ACTION_MODES,
} from "@/lib/automation-policy";
import { createClient } from "@/lib/supabase/server";

const modeSchema = z.enum(["automatic", "approval", "off"]);
const settingsSchema = z
  .object({
    paused: z.boolean().optional(),
    action_modes: z.record(z.string(), modeSchema).optional(),
    max_messages_per_client_day: z.number().int().min(1).max(20).optional(),
    minimum_confidence: z.number().min(0).max(1).optional(),
    quiet_hours_start: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    quiet_hours_end: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No settings supplied");

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, orgId: null };
  const { data } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return { supabase, orgId: data?.org_id || null };
}

export async function GET() {
  const { supabase, orgId } = await context();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase
    .from("automation_settings")
    .select(
      "ai_paused,pause_reason,paused_at,action_modes,max_automated_messages_per_client_day,minimum_confidence,quiet_hours_start,quiet_hours_end",
    )
    .eq("org_id", orgId)
    .maybeSingle();
  return NextResponse.json({
    ai_paused: Boolean(data?.ai_paused),
    pause_reason: data?.pause_reason || null,
    paused_at: data?.paused_at || null,
    action_modes: { ...DEFAULT_ACTION_MODES, ...(data?.action_modes || {}) },
    max_messages_per_client_day:
      data?.max_automated_messages_per_client_day || 4,
    minimum_confidence: Number(data?.minimum_confidence ?? 0.9),
    quiet_hours_start: String(data?.quiet_hours_start || "20:00").slice(0, 5),
    quiet_hours_end: String(data?.quiet_hours_end || "08:00").slice(0, 5),
    actions: AUTOMATION_ACTIONS,
  });
}

export async function PATCH(request: NextRequest) {
  const { supabase, orgId } = await context();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = settingsSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid setting" },
      { status: 400 },
    );
  const allowedKeys = new Set(AUTOMATION_ACTIONS.map((action) => action.key));
  if (
    parsed.data.action_modes &&
    Object.keys(parsed.data.action_modes).some(
      (key) => !allowedKeys.has(key as never),
    )
  ) {
    return NextResponse.json(
      { error: "Unknown automation action" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    org_id: orgId,
    updated_at: now,
  };
  if (typeof parsed.data.paused === "boolean") {
    payload.ai_paused = parsed.data.paused;
    payload.pause_reason = parsed.data.paused ? "Paused by agency" : null;
    payload.paused_at = parsed.data.paused ? now : null;
  }
  if (parsed.data.action_modes)
    payload.action_modes = {
      ...DEFAULT_ACTION_MODES,
      ...parsed.data.action_modes,
    };
  if (parsed.data.max_messages_per_client_day)
    payload.max_automated_messages_per_client_day =
      parsed.data.max_messages_per_client_day;
  if (parsed.data.minimum_confidence !== undefined)
    payload.minimum_confidence = parsed.data.minimum_confidence;
  if (parsed.data.quiet_hours_start)
    payload.quiet_hours_start = parsed.data.quiet_hours_start;
  if (parsed.data.quiet_hours_end)
    payload.quiet_hours_end = parsed.data.quiet_hours_end;
  const { data, error } = await supabase
    .from("automation_settings")
    .upsert(payload, { onConflict: "org_id" })
    .select(
      "ai_paused,pause_reason,paused_at,action_modes,max_automated_messages_per_client_day,minimum_confidence,quiet_hours_start,quiet_hours_end",
    )
    .single();
  if (error)
    return NextResponse.json(
      { error: "Automation setting could not be saved" },
      { status: 500 },
    );
  return NextResponse.json(data);
}
