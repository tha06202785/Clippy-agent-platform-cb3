import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const { data: prefs } = await supabase.from("lead_channel_preferences").select("*").eq("lead_id", leadId).maybeSingle();
  return NextResponse.json(prefs || {});
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const { data: prefs, error } = await supabase.from("lead_channel_preferences").upsert({
    lead_id: body.lead_id, org_id: body.org_id,
    email_consent: body.email_consent ?? true,
    sms_consent: body.sms_consent ?? true,
    whatsapp_consent: body.whatsapp_consent ?? true,
    phone_consent: body.phone_consent ?? true,
    transactional_allowed: body.transactional_allowed ?? true,
    marketing_allowed: body.marketing_allowed ?? false,
    preferred_channel: body.preferred_channel || "email",
    quiet_hours_start: body.quiet_hours_start || null,
    quiet_hours_end: body.quiet_hours_end || null,
    opted_out_at: body.opted_out ? new Date().toISOString() : null,
  }, { onConflict: "lead_id" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(prefs);
}
