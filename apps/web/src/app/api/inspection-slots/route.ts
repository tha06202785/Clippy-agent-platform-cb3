import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  let query = supabase.from("inspection_time_slots").select("*, listings!inner(address, price)").eq("org_id", (await supabase.from("org_members").select("org_id").eq("user_id", user.id).single()).data?.org_id);
  if (listingId) query = query.eq("listing_id", listingId);
  query = query.order("starts_at", { ascending: true });

  const { data: slots } = await query.limit(50);
  return NextResponse.json(slots || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: orgMember } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await req.json();
  if (!body.listing_id || !body.starts_at) return NextResponse.json({ error: "listing_id and starts_at required" }, { status: 400 });

  const { data: slot, error } = await supabase.from("inspection_time_slots").insert({
    org_id: orgMember.org_id, listing_id: body.listing_id,
    starts_at: body.starts_at, ends_at: body.ends_at || body.starts_at,
    timezone: body.timezone || "Australia/Sydney",
    inspection_type: body.inspection_type || "open_home",
    capacity: body.capacity || 10, status: "published",
    location_notes: body.location_notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(slot, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Slot ID required" }, { status: 400 });

  const body = await req.json();
  const { data: slot, error } = await supabase.from("inspection_time_slots").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(slot);
}
