import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const reason = body.reason || "cancelled_by_tenant";

  // Get booking
  const { data: booking } = await supabase.from("inspection_bookings").select("*").eq("id", id).single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Cancel booking
  await supabase.from("inspection_bookings").update({
    booking_status: "cancelled", cancelled_at: new Date().toISOString(),
    cancellation_reason: reason, updated_at: new Date().toISOString(),
  }).eq("id", id);

  // Decrement slot count
  if (booking.slot_id) {
    const { data: slot } = await supabase.from("inspection_time_slots").select("booking_count").eq("id", booking.slot_id).single();
    if (slot) {
      await supabase.from("inspection_time_slots").update({
        booking_count: Math.max(0, (slot.booking_count || 1) - 1),
        updated_at: new Date().toISOString(),
      }).eq("id", booking.slot_id);
    }
  }

  // Cancel all scheduled communications for this booking
  await supabase.from("scheduled_communications").update({
    status: "cancelled", cancelled_at: new Date().toISOString(),
  }).eq("inspection_booking_id", id).in("status", ["scheduled", "processing"]);

  return NextResponse.json({ success: true });
}
