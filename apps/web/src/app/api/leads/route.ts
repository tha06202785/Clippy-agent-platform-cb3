import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLeadSchema, updateLeadSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
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

  // org_members table may not exist — fall back to filtering by user_id on leads table
  let orgId: string | null = null;
  try {
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();
    orgId = orgMember?.org_id ?? null;
  } catch {
    // table may not exist
  }

  let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50);
  if (orgId) {
    query = query.eq("org_id", orgId);
  } else {
    // Fallback: show leads where user_id matches OR org_id matches the seed org
    query = query.or(`user_id.eq.${user.id},org_id.eq.7f91a043-805b-4e67-83ab-36b14bf85898`);
  }
  const { data: leads } = await query;
  return NextResponse.json(leads || []);
}

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
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

export async function PATCH(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
  }

  const body = await req.json();
  const validation = validate(updateLeadSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("leads")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
  }

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
