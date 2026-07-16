import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  if (!body.new_slot_id) return NextResponse.json({ error: "new_slot_id required" }, { status: 400 });

  // Check new slot availability
  const { data: newSlot } = await supabase.from("inspection_time_slots").select("*").eq("id", body.new_slot_id).single();
  if (!newSlot || newSlot.status !== "published") return NextResponse.json({ error: "New slot not available" }, { status: 400 });
  if (newSlot.booking_count >= newSlot.capacity) return NextResponse.json({ error: "New slot is full" }, { status: 400 });

  // Get old booking
  const { data: booking } = await supabase.from("inspection_bookings").select("*").eq("id", id).single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Cancel old scheduled comms
  await supabase.from("scheduled_communications").update({
    status: "cancelled", cancelled_at: new Date().toISOString(),
  }).eq("inspection_booking_id", id).in("status", ["scheduled", "processing"]);

  // Decrement old slot
  if (booking.slot_id) {
    const { data: oldSlot } = await supabase.from("inspection_time_slots").select("booking_count").eq("id", booking.slot_id).single();
    if (oldSlot) {
      await supabase.from("inspection_time_slots").update({
        booking_count: Math.max(0, (oldSlot.booking_count || 1) - 1),
      }).eq("id", booking.slot_id);
    }
  }

  // Update booking to new slot
  await supabase.from("inspection_bookings").update({
    slot_id: body.new_slot_id, booking_status: "confirmed",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  // Increment new slot
  await supabase.from("inspection_time_slots").update({
    booking_count: newSlot.booking_count + 1,
  }).eq("id", body.new_slot_id);

  // Schedule new reminders
  const now = new Date();
  const slotTime = new Date(newSlot.starts_at);
  const reminder24h = new Date(slotTime.getTime() - 24 * 60 * 60 * 1000);
  const reminder2h = new Date(slotTime.getTime() - 2 * 60 * 60 * 1000);

  const comms = [
    { type: "booking_confirmation", scheduled_for: now },
  ];
  if (reminder24h > now) comms.push({ type: "inspection_reminder_24h", scheduled_for: reminder24h });
  if (reminder2h > now) comms.push({ type: "inspection_reminder_2h", scheduled_for: reminder2h });

  for (const c of comms) {
    await supabase.from("scheduled_communications").insert({
      org_id: booking.org_id, lead_id: booking.lead_id,
      conversation_id: booking.conversation_id || null,
      inspection_booking_id: id,
      type: c.type, channel: "email",
      scheduled_for: c.scheduled_for.toISOString(),
      status: "scheduled",
      idempotency_key: "comm_" + id + "_" + c.type + "_rescheduled",
    });
  }

  return NextResponse.json({ success: true });
}
