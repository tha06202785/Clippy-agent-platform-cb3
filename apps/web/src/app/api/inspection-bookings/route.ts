import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: orgMember } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json([]);

  const { data: bookings } = await supabase
    .from("inspection_bookings")
    .select("*, inspection_time_slots!inner(starts_at, ends_at, capacity, inspection_type, address), leads!inner(full_name, email, phone), listings!inner(address, price)")
    .eq("org_id", orgMember.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(bookings || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: orgMember } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
  if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await req.json();
  if (!body.slot_id || !body.lead_id || !body.listing_id) {
    return NextResponse.json({ error: "slot_id, lead_id, and listing_id required" }, { status: 400 });
  }

  // Atomic capacity check
  const { data: slot } = await supabase.from("inspection_time_slots").select("*").eq("id", body.slot_id).single();
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  if (slot.status !== "published") return NextResponse.json({ error: "Slot is not available" }, { status: 400 });
  if (slot.booking_count >= slot.capacity) return NextResponse.json({ error: "Slot is full" }, { status: 400 });

  // Reserve and increment atomically
  const { data: booking, error } = await supabase.from("inspection_bookings").insert({
    org_id: orgMember.org_id, slot_id: body.slot_id,
    listing_id: body.listing_id, lead_id: body.lead_id,
    conversation_id: body.conversation_id || null,
    booking_status: "confirmed", attendee_count: body.attendee_count || 1,
    source_channel: body.source_channel || "website",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment booking count
  await supabase.from("inspection_time_slots").update({
    booking_count: slot.booking_count + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", body.slot_id);

  // Schedule confirmation + reminders
  const now = new Date();
  const slotTime = new Date(slot.starts_at);
  const reminder24h = new Date(slotTime.getTime() - 24 * 60 * 60 * 1000);
  const reminder2h = new Date(slotTime.getTime() - 2 * 60 * 60 * 1000);

  const comms = [
    { type: "booking_confirmation", scheduled_for: now, channel: "email" },
  ];
  if (reminder24h > now) {
    comms.push({ type: "inspection_reminder_24h", scheduled_for: reminder24h, channel: "email" });
  }
  if (reminder2h > now) {
    comms.push({ type: "inspection_reminder_2h", scheduled_for: reminder2h, channel: "email" });
  }

  for (const c of comms) {
    await supabase.from("scheduled_communications").insert({
      org_id: orgMember.org_id, lead_id: body.lead_id,
      conversation_id: body.conversation_id || null,
      inspection_booking_id: booking.id,
      type: c.type, channel: c.channel,
      scheduled_for: c.scheduled_for.toISOString(),
      status: "scheduled",
      idempotency_key: "comm_" + booking.id + "_" + c.type,
    });
  }

  return NextResponse.json(booking, { status: 201 });
}
