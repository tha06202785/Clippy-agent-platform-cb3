import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLeadSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "leads");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } }
    );
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch leads for this user's org
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!orgMember) {
    return NextResponse.json([]);
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("org_id", orgMember.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(leads || []);
}

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "leads");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } }
    );
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!orgMember) {
    return NextResponse.json({ error: "No org found" }, { status: 400 });
  }

  const body = await req.json();
    const validation = validate(createLeadSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { data: newLead, error } = await supabase
    .from("leads")
    .insert({ ...body, org_id: orgMember.org_id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newLead, { status: 201 });
}
