import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgMember } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json([]);

  const { data: bookings } = await supabase
    .from("inspection_bookings")
    .select("*, leads(full_name, email, phone), listings(address, price)")
    .eq("org_id", orgMember.org_id)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  return NextResponse.json(bookings || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgMember } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const body = await req.json();
  if (!body.lead_id || !body.listing_id || !body.scheduled_at) {
    return NextResponse.json({ error: "lead_id, listing_id, and scheduled_at required" }, { status: 400 });
  }

  const { data: booking, error } = await supabase
    .from("inspection_bookings")
    .insert({
      org_id: orgMember.org_id,
      lead_id: body.lead_id,
      listing_id: body.listing_id,
      scheduled_at: body.scheduled_at,
      attendees: body.attendees || 1,
      notes: body.notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(booking, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Booking ID required" }, { status: 400 });

  const body = await req.json();
  const { data: booking, error } = await supabase
    .from("inspection_bookings")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(booking);
}
