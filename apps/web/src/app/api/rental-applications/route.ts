import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: orgMember } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json([]);

  const { data: apps } = await supabase
    .from("rental_applications")
    .select("*, leads!inner(full_name, email, phone), listings!inner(address, price)")
    .eq("org_id", orgMember.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(apps || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: orgMember } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await req.json();
  if (!body.listing_id || !body.lead_id) {
    return NextResponse.json({ error: "listing_id and lead_id required" }, { status: 400 });
  }

  const { data: app, error } = await supabase.from("rental_applications").insert({
    org_id: orgMember.org_id, listing_id: body.listing_id,
    lead_id: body.lead_id, inspection_booking_id: body.inspection_booking_id || null,
    external_provider: body.external_provider || null,
    application_url: body.application_url || null,
    status: "not_started",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(app, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Application ID required" }, { status: 400 });

  const body = await req.json();
  const updates: any = { ...body, updated_at: new Date().toISOString() };
  if (body.status === "submitted") updates.submitted_at = new Date().toISOString();
  if (body.status === "approved" || body.status === "declined") updates.reviewed_at = new Date().toISOString();

  const { data: app, error } = await supabase.from("rental_applications").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(app);
}
