import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function authenticatedOrg() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, orgId: null };
  const { data, error } = await supabase
    .from("user_org_roles").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (error) throw error;
  return { supabase, orgId: data?.org_id || null };
}

export async function GET() {
  try {
    const { supabase, orgId } = await authenticatedOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabase
      .from("inspection_bookings")
      .select("*, inspection_time_slots!inner(starts_at, ends_at, capacity, inspection_type, address), leads!inner(full_name, email, phone), listings!inner(address, price)")
      .eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
    if (error) {
      console.error("Inspection list failed", error.code);
      return NextResponse.json({ error: "Inspections are unavailable" }, { status: 503 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Inspection list failed", error);
    return NextResponse.json({ error: "Inspections are unavailable" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, orgId } = await authenticatedOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (!body.slot_id || !body.lead_id || !body.listing_id) {
      return NextResponse.json({ error: "slot_id, lead_id, and listing_id required" }, { status: 400 });
    }
    const attendeeCount = Number(body.attendee_count || 1);
    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      return NextResponse.json({ error: "attendee_count must be a positive integer" }, { status: 400 });
    }
    const { data: booking, error } = await supabase.rpc("reserve_inspection", {
      p_slot_id: body.slot_id,
      p_listing_id: body.listing_id,
      p_lead_id: body.lead_id,
      p_conversation_id: body.conversation_id || null,
      p_attendee_count: attendeeCount,
      p_source_channel: body.source_channel || "website",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const created = Array.isArray(booking) ? booking[0] : booking;
    const { data: slot, error: slotError } = await supabase
      .from("inspection_time_slots").select("starts_at").eq("id", body.slot_id).single();
    if (slotError || !slot) {
      console.error("Inspection reminder lookup failed", slotError?.code);
      return NextResponse.json(created, { status: 201 });
    }

    const now = new Date();
    const slotTime = new Date(slot.starts_at);
    const reminders = [
      { type: "booking_confirmation", scheduled_for: now },
      { type: "inspection_reminder_24h", scheduled_for: new Date(slotTime.getTime() - 86400000) },
      { type: "inspection_reminder_2h", scheduled_for: new Date(slotTime.getTime() - 7200000) },
    ].filter(item => item.type === "booking_confirmation" || item.scheduled_for > now);

    const { error: reminderError } = await supabase.from("scheduled_communications").insert(
      reminders.map(item => ({
        org_id: orgId, lead_id: body.lead_id, conversation_id: body.conversation_id || null,
        inspection_booking_id: created.id, type: item.type, channel: "email",
        scheduled_for: item.scheduled_for.toISOString(), status: "scheduled",
        idempotency_key: "comm_" + created.id + "_" + item.type,
      })),
    );
    if (reminderError) console.error("Inspection reminder scheduling failed", reminderError.code);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Inspection booking failed", error);
    return NextResponse.json({ error: "Inspection could not be booked" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, orgId } = await authenticatedOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    const { attendance_status } = await req.json();
    if (!["unknown", "attended", "did_not_attend"].includes(attendance_status)) {
      return NextResponse.json({ error: "Invalid attendance status" }, { status: 400 });
    }
    const { data, error } = await supabase.from("inspection_bookings")
      .update({ attendance_status, updated_at: new Date().toISOString() })
      .eq("id", id).eq("org_id", orgId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Attendance update failed", error);
    return NextResponse.json({ error: "Attendance could not be updated" }, { status: 500 });
  }
}
