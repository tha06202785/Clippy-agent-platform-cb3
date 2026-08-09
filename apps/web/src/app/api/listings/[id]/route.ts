import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateListingSchema, validate } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function authOrg() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, orgId: null };
  const { data, error } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (error) throw error;
  return { supabase, orgId: data?.org_id || null };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabase.from("listings").select("*").eq("id", id).eq("org_id", orgId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Listing lookup failed", error);
    return NextResponse.json({ error: "Listing is unavailable" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const validation = validate(updateListingSchema, await req.json());
    if (!validation.success || !validation.data) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { data, error } = await supabase.from("listings").update(validation.data)
      .eq("id", id).eq("org_id", orgId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Listing update failed", error);
    return NextResponse.json({ error: "Listing could not be updated" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await authOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { error } = await supabase.from("listings").delete().eq("id", id).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Listing deletion failed", error);
    return NextResponse.json({ error: "Listing could not be deleted" }, { status: 500 });
  }
}
