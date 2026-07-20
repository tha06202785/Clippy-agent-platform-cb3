import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(ip, "briefings");
  if (!allowed) return NextResponse.json({ error: "Tool many requests" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgMember } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json([]);

  const { data: briefings } = await supabase
    .from("briefings")
    .select("*")
    .eq("org_id", orgMember.org_id)
    .order("date", { ascending: false })
    .limit(20);

  return NextResponse.json(briefings || []);
}

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(ip, "briefings");
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgMember } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const body = await req.json();
  const { data: briefing, error } = await supabase.from("briefings").insert({
    org_id: orgMember.org_id,
    title: body.title || "Morning Briefing - " + new Date().toLocaleDateString(),
    date: new Date().toISOString(),
    status: "generated",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(briefing, { status: 201 });
}
