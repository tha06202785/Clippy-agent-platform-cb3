import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Get due communications
    const { data: comms } = await supabase
      .from("scheduled_communications")
      .select("*, leads!inner(full_name, email, phone), inspection_bookings!inner(booking_status, attendance_status, listing_id)")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .limit(20);

    if (!comms || comms.length === 0) return NextResponse.json({ processed: 0 });

    let processed = 0;
    for (const comm of comms) {
      try {
        // Re-check state before sending
        const booking = comm.inspection_bookings;
        if (!booking || booking.booking_status === "cancelled") {
          await supabase.from("scheduled_communications").update({ status: "cancelled", cancelled_at: now }).eq("id", comm.id);
          continue;
        }

        // Check opt-out
        const { data: prefs } = await supabase.from("lead_channel_preferences").select("*").eq("lead_id", comm.lead_id).maybeSingle();
        if (prefs?.opted_out_at) {
          await supabase.from("scheduled_communications").update({ status: "cancelled", cancelled_at: now }).eq("id", comm.id);
          continue;
        }

        // Check quiet hours
        if (prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
          const hour = new Date().getHours();
          const start = parseInt(prefs.quiet_hours_start.split(":")[0]);
          const end = parseInt(prefs.quiet_hours_end.split(":")[0]);
          if (hour >= start || hour < end) {
            // Reschedule to next non-quiet hour
            const reschedule = new Date();
            reschedule.setHours(end, 0, 0, 0);
            await supabase.from("scheduled_communications").update({
              scheduled_for: reschedule.toISOString(),
            }).eq("id", comm.id);
            continue;
          }
        }

        // Generate message via AI brain
        const messageType = comm.type;
        let prompt = "";
        if (messageType === "booking_confirmation") prompt = "Send inspection booking confirmation with address, time, and what to bring.";
        else if (messageType === "inspection_reminder_24h") prompt = "Send reminder: inspection is tomorrow. Include address and time.";
        else if (messageType === "inspection_reminder_2h") prompt = "Send reminder: inspection is in 2 hours. Include address and time.";
        else if (messageType === "inspection_followup") prompt = "Ask how the inspection went and if they want to apply.";
        else if (messageType === "application_reminder") prompt = "Remind them to complete their rental application.";
        else prompt = "Send a friendly follow-up message.";

        const aiRes = await fetch("https://useclippy.com/api/ai/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: comm.channel || "email",
            leadId: comm.lead_id,
            conversationId: comm.conversation_id,
            message: "[SYSTEM: " + prompt + " for booking " + comm.inspection_booking_id + "]",
            metadata: { isAutomated: true, communicationType: comm.type },
          }),
        });
        const aiData = await aiRes.json();

        await supabase.from("scheduled_communications").update({
          status: aiData.escalation ? "failed" : "sent",
          sent_at: now, attempt_count: comm.attempt_count + 1,
          last_error: aiData.escalation ? "AI escalated" : null,
        }).eq("id", comm.id);

        processed++;
      } catch (err: any) {
        await supabase.from("scheduled_communications").update({
          status: comm.attempt_count + 1 >= comm.max_attempts ? "dead_letter" : "scheduled",
          attempt_count: comm.attempt_count + 1,
          last_error: err.message,
        }).eq("id", comm.id);
      }
    }

    return NextResponse.json({ processed });
  } catch (error: any) {
    console.error("Scheduled comms error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
