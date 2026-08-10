import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("ai_paused,pause_reason,paused_at")
    .eq("org_id", orgId)
    .maybeSingle();
  return NextResponse.json(
    data || { ai_paused: false, pause_reason: null, paused_at: null },
  );
}

export async function PATCH(request: NextRequest) {
  const { supabase, orgId } = await context();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.paused !== "boolean")
    return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("automation_settings")
    .upsert(
      {
        org_id: orgId,
        ai_paused: body.paused,
        pause_reason: body.paused ? "Paused by agency" : null,
        paused_at: body.paused ? now : null,
        updated_at: now,
      },
      { onConflict: "org_id" },
    )
    .select("ai_paused,pause_reason,paused_at")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Automation setting could not be saved" },
      { status: 500 },
    );
  return NextResponse.json(data);
}
