import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLeadSchema, updateLeadSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function limited(ip: string) {
  const result = checkRateLimit(ip, "leads");
  if (result.allowed) return null;
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

async function authOrg() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, orgId: null };
  const { data, error } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (error) throw error;
  return { supabase, orgId: data?.org_id || null };
}

export async function GET() {
  const blocked = limited(await getClientIp()); if (blocked) return blocked;
  try {
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabase.from("leads").select("*").eq("org_id", orgId)
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Lead list failed", error);
    return NextResponse.json({ error: "Leads are unavailable" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = limited(await getClientIp()); if (blocked) return blocked;
  try {
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const validation = validate(createLeadSchema, await req.json());
    if (!validation.success || !validation.data) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { data, error } = await supabase.from("leads")
      .insert({ ...validation.data, org_id: orgId }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Lead creation failed", error);
    return NextResponse.json({ error: "Lead could not be created" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const blocked = limited(await getClientIp()); if (blocked) return blocked;
  try {
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    const validation = validate(updateLeadSchema, await req.json());
    if (!validation.success || !validation.data) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { data, error } = await supabase.from("leads").update(validation.data)
      .eq("id", id).eq("org_id", orgId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Lead update failed", error);
    return NextResponse.json({ error: "Lead could not be updated" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const blocked = limited(await getClientIp()); if (blocked) return blocked;
  try {
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    const { error } = await supabase.from("leads").delete().eq("id", id).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead deletion failed", error);
    return NextResponse.json({ error: "Lead could not be deleted" }, { status: 500 });
  }
}
