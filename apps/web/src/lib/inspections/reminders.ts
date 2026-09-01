import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import {
  evaluateAutomationAction,
  queueAutomationApproval,
} from "@/lib/automation-policy";
import { resolveAgentName } from "@/lib/inspections/booking-automation";

type AdminClient = any;

function formatMelbourneDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function processInspectionReminders(admin: AdminClient) {
  const now = new Date().toISOString();
  const { data: communications, error } = await admin
    .from("scheduled_communications")
    .select(
      "id,org_id,lead_id,conversation_id,inspection_booking_id,type,attempt_count,max_attempts",
    )
    .eq("status", "scheduled")
    .in("type", [
      "booking_confirmation",
      "inspection_reminder_24h",
      "inspection_reminder_2h",
    ])
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(20);
  if (error) throw error;

  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const communication of communications || []) {
    const attempts = (communication.attempt_count || 0) + 1;
    const { data: claimed } = await admin
      .from("scheduled_communications")
      .update({
        status: "processing",
        attempt_count: attempts,
        updated_at: now,
      })
      .eq("id", communication.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const [{ data: booking }, { data: lead }, { data: preferences }] =
        await Promise.all([
          admin
            .from("inspection_bookings")
            .select(
              "id,booking_status,slot_id,listing_id,client_calendar_token,confirmation_sent_at",
            )
            .eq("id", communication.inspection_booking_id)
            .eq("org_id", communication.org_id)
            .maybeSingle(),
          admin
            .from("leads")
            .select("full_name,email")
            .eq("id", communication.lead_id)
            .eq("org_id", communication.org_id)
            .maybeSingle(),
          admin
            .from("lead_channel_preferences")
            .select("opted_out_at")
            .eq("lead_id", communication.lead_id)
            .maybeSingle(),
        ]);
      if (!booking || booking.booking_status !== "confirmed") {
        await admin
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: now })
          .eq("id", communication.id);
        results.push({ id: communication.id, success: true });
        continue;
      }
      if (preferences?.opted_out_at || !lead?.email) {
        await admin
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: now })
          .eq("id", communication.id);
        results.push({ id: communication.id, success: true });
        continue;
      }

      const [{ data: slot }, { data: listing }, { data: conversation }] =
        await Promise.all([
          admin
            .from("inspection_time_slots")
            .select("starts_at,address")
            .eq("id", booking.slot_id)
            .maybeSingle(),
          admin
            .from("listings")
            .select("address")
            .eq("id", booking.listing_id)
            .maybeSingle(),
          communication.conversation_id
            ? admin
                .from("conversations")
                .select("external_thread_id,integration_account_id")
                .eq("id", communication.conversation_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
      if (!slot?.starts_at) throw new Error("Inspection slot was not found");
      const address = listing?.address || slot.address || "the property";
      if (
        communication.type === "booking_confirmation" &&
        booking.confirmation_sent_at
      ) {
        await admin
          .from("scheduled_communications")
          .update({ status: "sent", sent_at: booking.confirmation_sent_at })
          .eq("id", communication.id);
        results.push({ id: communication.id, success: true });
        continue;
      }
      const timing =
        communication.type === "inspection_reminder_24h"
          ? "tomorrow"
          : "in approximately 2 hours";
      const firstName = lead.full_name?.split(/\s+/)[0];
      const agentName = await resolveAgentName(admin, communication.org_id);
      const content =
        communication.type === "booking_confirmation"
          ? [
              `Hi${firstName ? ` ${firstName}` : ""},`,
              "",
              `Your inspection for ${address} is confirmed for ${formatMelbourneDate(slot.starts_at)}.`,
              "",
              "I’ll send you a reminder 24 hours before and again 2 hours before the inspection.",
              `Add this inspection to your calendar: ${process.env.NEXT_PUBLIC_APP_URL || "https://useclippy.com"}/inspection/${booking.client_calendar_token}`,
              "",
              "Kind regards,",
              agentName,
            ].join("\n")
          : [
              `Hi${firstName ? ` ${firstName}` : ""},`,
              "",
              `A friendly reminder that your inspection at ${address} is ${timing}, on ${formatMelbourneDate(slot.starts_at)}.`,
              "",
              "Please reply to this email if you can no longer attend.",
              "",
              "Kind regards,",
              agentName,
            ].join("\n");
      const subject =
        communication.type === "booking_confirmation"
          ? `Inspection confirmed – ${address}`
          : `Inspection reminder – ${address}`;
      const actionKey =
        communication.type === "booking_confirmation"
          ? "booking_confirmation"
          : "inspection_reminders";
      const decision = await evaluateAutomationAction({
        admin,
        orgId: communication.org_id,
        actionKey,
        leadId: communication.lead_id,
        confidence: 1,
      });
      if (decision.outcome === "off") {
        await admin
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: now, updated_at: now })
          .eq("id", communication.id);
        results.push({ id: communication.id, success: true });
        continue;
      }
      if (decision.outcome === "approval") {
        await queueAutomationApproval({
          admin,
          orgId: communication.org_id,
          actionKey,
          channel: "email",
          recipient: lead.email,
          content,
          subject,
          leadId: communication.lead_id,
          conversationId: communication.conversation_id,
          bookingId: booking.id,
          scheduledCommunicationId: communication.id,
          confidence: 1,
          reason: decision.reason,
          idempotencyKey: `approval_comm_${communication.id}`,
        });
        results.push({ id: communication.id, success: true });
        continue;
      }
      const delivery = await deliverApprovedMessage({
        admin,
        orgId: communication.org_id,
        channel: "email",
        recipient: lead.email,
        content,
        subject,
        threadId: conversation?.external_thread_id || null,
        integrationAccountId: conversation?.integration_account_id || null,
      });
      if (communication.conversation_id) {
        await admin.from("messages").insert({
          org_id: communication.org_id,
          conversation_id: communication.conversation_id,
          direction_in_out: "out",
          text: content,
          read_at: now,
          raw_json: {
            channel: "email",
            external_message_id: delivery.externalId,
            gmail_thread_id: delivery.threadId,
            automation: communication.type,
            automated: true,
          },
        });
      }
      await admin
        .from("scheduled_communications")
        .update({
          status: "sent",
          sent_at: now,
          last_error: null,
          updated_at: now,
        })
        .eq("id", communication.id);
      if (communication.type === "booking_confirmation") {
        await admin
          .from("inspection_bookings")
          .update({ confirmation_sent_at: now })
          .eq("id", booking.id);
      }
      results.push({ id: communication.id, success: true });
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message.slice(0, 300)
          : "Reminder delivery failed";
      await admin
        .from("scheduled_communications")
        .update({
          status:
            attempts >= communication.max_attempts
              ? "dead_letter"
              : "scheduled",
          last_error: message,
          updated_at: now,
        })
        .eq("id", communication.id);
      results.push({ id: communication.id, success: false, error: message });
    }
  }

  return {
    processed: results.length,
    sent: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  };
}
