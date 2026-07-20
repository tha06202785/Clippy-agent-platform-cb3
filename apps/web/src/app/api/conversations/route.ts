import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "conversations");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).single();
    if (!orgMember) return NextResponse.json([]);

    const { data: conversations } = await supabase
      .from("conversations")
      .select("*, leads(full_name, email, phone)")
      .eq("org_id", orgMember.org_id)
      .order("updated_at", { ascending: false })
      .limit(50);

    return NextResponse.json(conversations || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).single();
    if (!orgMember) return NextResponse.json({ error: "No org membership" }, { status: 400 });

    const body = await req.json();
    const { lead_id, channel, external_id } = body;

    const { data: conversation } = await supabase
      .from("conversations")
      .insert({ org_id: orgMember.org_id, lead_id, channel, external_conversation_id: external_id })
      .select()
      .single();

    return NextResponse.json(conversation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
