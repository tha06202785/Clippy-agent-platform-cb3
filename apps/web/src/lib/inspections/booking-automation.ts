import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import { recordClippyActivity } from "@/lib/activity-log";
import {
  evaluateAutomationAction,
  queueAutomationApproval,
} from "@/lib/automation-policy";
import { decryptIntegrationCredentials } from "@/lib/integration-credentials";
import {
  refreshGoogleCredentials,
  type GoogleCredentials,
} from "@/lib/integrations/google-sync";
import { getIntegrationAccount } from "@/lib/integrations/integration-accounts";
import { refreshMicrosoftCredentials } from "@/lib/integrations/microsoft-graph";

type AdminClient = any;

const calendarApi = "https://www.googleapis.com/calendar/v3";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

function formatMelbourneDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function resolveAgentName(admin: AdminClient, orgId: string) {
  const { data: membership } = await admin
    .from("user_org_roles")
    .select("user_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership?.user_id) return "";
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("user_id", membership.user_id)
    .maybeSingle();
  return profile?.full_name?.trim() || "";
}

export async function completeInspectionBooking({
  admin,
  orgId,
  bookingId,
  enquiryId,
  origin,
}: {
  admin: AdminClient;
  orgId: string;
  bookingId: string;
  enquiryId?: string | null;
  origin: string;
}) {
  const { data: booking, error } = await admin
    .from("inspection_bookings")
    .select(
      "id,org_id,slot_id,listing_id,lead_id,conversation_id,client_calendar_token,google_calendar_event_id,google_calendar_html_link,calendar_integration_account_id,inspection_time_slots(starts_at,ends_at,address),listings(address),leads(full_name,email),conversations(external_thread_id,integration_account_id)",
    )
    .eq("id", bookingId)
    .eq("org_id", orgId)
    .single();
  if (error || !booking) throw error || new Error("Booking was not found");

  const slot = one(booking.inspection_time_slots) as {
    starts_at: string;
    ends_at: string;
    address?: string | null;
  } | null;
  const listing = one(booking.listings) as { address?: string | null } | null;
  const lead = one(booking.leads) as {
    full_name?: string | null;
    email?: string | null;
  } | null;
  const conversation = one(booking.conversations) as {
    external_thread_id?: string | null;
    integration_account_id?: string | null;
  } | null;
  if (!slot) throw new Error("Inspection slot was not found");

  const address = listing?.address || slot.address || "Property inspection";
  const calendarUrl = `${origin}/inspection/${booking.client_calendar_token}`;
  const now = new Date();
  const startsAt = new Date(slot.starts_at);
  const communications = [
    { type: "booking_confirmation", scheduledFor: now },
    {
      type: "inspection_reminder_24h",
      scheduledFor: new Date(startsAt.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      type: "inspection_reminder_2h",
      scheduledFor: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000),
    },
  ].filter(
    (item) =>
      item.type === "booking_confirmation" ||
      item.scheduledFor.getTime() > now.getTime(),
  );

  await admin.from("scheduled_communications").upsert(
    communications.map((item) => ({
      org_id: orgId,
      lead_id: booking.lead_id,
      conversation_id: booking.conversation_id || null,
      inspection_booking_id: booking.id,
      type: item.type,
      channel: "email",
      scheduled_for: item.scheduledFor.toISOString(),
      status: "scheduled",
      idempotency_key: `comm_${booking.id}_${item.type}`,
    })),
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );

  let calendarStatus = booking.google_calendar_event_id ? "synced" : "failed";
  let calendarEventId: string | null = booking.google_calendar_event_id;
  let calendarHtmlLink: string | null = booking.google_calendar_html_link;
  let calendarIntegrationAccountId: string | null =
    booking.calendar_integration_account_id ||
    conversation?.integration_account_id ||
    null;
  let calendarError: string | null = null;
  try {
    if (calendarEventId) throw new Error("__calendar_already_synced__");
    let account = null;
    try {
      account = await getIntegrationAccount({
        admin,
        orgId,
        accountId: calendarIntegrationAccountId,
        resourceType: "calendar",
        capability: "send",
      });
    } catch (accountError) {
      if ((accountError as { code?: string })?.code !== "42P01") {
        throw accountError;
      }
    }
    calendarIntegrationAccountId = account?.id || null;
    let accessToken = "";
    let eventUrl: URL;
    if (account?.provider === "microsoft") {
      const credentials = await refreshMicrosoftCredentials(admin, account);
      accessToken = credentials.access_token || "";
      eventUrl = new URL("https://graph.microsoft.com/v1.0/me/events");
    } else {
      let encrypted = account?.credentials_encrypted;
      if (!encrypted) {
        const { data: integration } = await admin
          .from("integrations")
          .select("credentials_encrypted")
          .eq("org_id", orgId)
          .eq("provider", "google-calendar")
          .eq("status", "connected")
          .maybeSingle();
        encrypted = integration?.credentials_encrypted;
      }
      if (!encrypted) throw new Error("A connected calendar was not found");
      const stored = decryptIntegrationCredentials<GoogleCredentials>(encrypted);
      const credentials = await refreshGoogleCredentials(
        admin,
        orgId,
        stored,
        account?.id,
      );
      accessToken = credentials.access_token || "";
      eventUrl = new URL(`${calendarApi}/calendars/primary/events`);
      eventUrl.searchParams.set("sendUpdates", "none");
    }
    if (!accessToken) throw new Error("Calendar access has expired");
    const description = [
      lead?.full_name ? `Client: ${lead.full_name}` : "",
      lead?.email ? `Email: ${lead.email}` : "",
      `Clippy booking: ${booking.id}`,
    ]
      .filter(Boolean)
      .join("\n");
    const isMicrosoft = account?.provider === "microsoft";
    const response = await fetch(eventUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        isMicrosoft
          ? {
              subject: `Property inspection – ${address}`,
              body: { contentType: "Text", content: description },
              location: { displayName: address },
              start: {
                dateTime: new Date(slot.starts_at)
                  .toISOString()
                  .replace(/Z$/, ""),
                timeZone: "UTC",
              },
              end: {
                dateTime: new Date(slot.ends_at)
                  .toISOString()
                  .replace(/Z$/, ""),
                timeZone: "UTC",
              },
              isReminderOn: true,
              reminderMinutesBeforeStart: 120,
              transactionId: booking.id,
            }
          : {
              summary: `Property inspection – ${address}`,
              description,
              location: address,
              start: {
                dateTime: slot.starts_at,
                timeZone: "Australia/Melbourne",
              },
              end: {
                dateTime: slot.ends_at,
                timeZone: "Australia/Melbourne",
              },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: "popup", minutes: 24 * 60 },
                  { method: "popup", minutes: 120 },
                ],
              },
              extendedProperties: {
                private: { clippy_booking_id: booking.id },
              },
            },
      ),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id) {
      throw new Error(
        payload.error?.message || "Calendar event could not be created",
      );
    }
    calendarStatus = "synced";
    calendarEventId = String(payload.id);
    calendarHtmlLink = payload.htmlLink
      ? String(payload.htmlLink)
      : payload.webLink
        ? String(payload.webLink)
        : null;
  } catch (syncError) {
    if (
      syncError instanceof Error &&
      syncError.message === "__calendar_already_synced__"
    ) {
      calendarError = null;
    } else {
      calendarError =
        syncError instanceof Error
          ? syncError.message.slice(0, 300)
          : "Calendar sync failed";
    }
  }

  await admin
    .from("inspection_bookings")
    .update({
      enquiry_id: enquiryId || null,
      google_calendar_event_id: calendarEventId,
      google_calendar_html_link: calendarHtmlLink,
      calendar_integration_account_id: calendarIntegrationAccountId,
      calendar_sync_status: calendarStatus,
      calendar_sync_error: calendarError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .eq("org_id", orgId);

  let confirmationSent = false;
  if (lead?.email) {
    const decision = await evaluateAutomationAction({
      admin,
      orgId,
      actionKey: "booking_confirmation",
      leadId: booking.lead_id,
      confidence: 1,
    });
    const agentName = await resolveAgentName(admin, orgId);
    const content = [
      `Hi${lead.full_name ? ` ${lead.full_name.split(/\s+/)[0]}` : ""},`,
      "",
      `Your inspection for ${address} is confirmed for ${formatMelbourneDate(slot.starts_at)}.`,
      "",
      "I’ll send you a reminder 24 hours before and again 2 hours before the inspection.",
      `Add this inspection to your calendar: ${calendarUrl}`,
      "",
      "Kind regards,",
      agentName,
    ].join("\n");
    const confirmationKey = `comm_${booking.id}_booking_confirmation`;
    const { data: confirmationCommunication } = await admin
      .from("scheduled_communications")
      .select("id")
      .eq("idempotency_key", confirmationKey)
      .maybeSingle();
    if (decision.outcome === "off") {
      if (confirmationCommunication?.id) {
        await admin
          .from("scheduled_communications")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", confirmationCommunication.id);
      }
    } else if (decision.outcome === "approval") {
      await queueAutomationApproval({
        admin,
        orgId,
        actionKey: "booking_confirmation",
        channel: "email",
        recipient: lead.email,
        content,
        subject: `Inspection confirmed – ${address}`,
        leadId: booking.lead_id,
        conversationId: booking.conversation_id,
        bookingId: booking.id,
        scheduledCommunicationId: confirmationCommunication?.id,
        confidence: 1,
        reason: decision.reason,
        idempotencyKey: `approval_${confirmationKey}`,
      });
    } else {
      try {
        const delivery = await deliverApprovedMessage({
          admin,
          orgId,
          channel: "email",
          recipient: lead.email,
          content,
          subject: `Inspection confirmed – ${address}`,
          threadId: conversation?.external_thread_id || null,
          integrationAccountId: conversation?.integration_account_id || null,
        });
        if (booking.conversation_id) {
          await admin.from("messages").insert({
            org_id: orgId,
            conversation_id: booking.conversation_id,
            direction_in_out: "out",
            text: content,
            read_at: new Date().toISOString(),
            raw_json: {
              channel: "email",
              external_message_id: delivery.externalId,
              gmail_thread_id: delivery.threadId,
              automation: "booking_confirmation",
              automated: true,
            },
          });
        }
        confirmationSent = true;
        await admin
          .from("scheduled_communications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempt_count: 1,
          })
          .eq("idempotency_key", confirmationKey);
        await admin
          .from("inspection_bookings")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", booking.id);
      } catch (sendError) {
        console.error(
          "Inspection confirmation delivery failed",
          sendError instanceof Error ? sendError.message : sendError,
        );
      }
    }
  }

  await recordClippyActivity(admin, {
    orgId,
    action: "inspection_booking_completed",
    category: "inspection",
    title: "Inspection booking completed",
    description: calendarStatus === "synced"
      ? "A client inspection was booked and added to the connected calendar."
      : "A client inspection was booked; Calendar sync still needs attention.",
    impactSummary: "Client booking and reminder workflow created",
    metadata: {
      booking_id: booking.id,
      calendar_synced: calendarStatus === "synced",
      confirmation_sent: confirmationSent,
      reminders_prepared: communications.filter((item) =>
        item.type.startsWith("inspection_reminder_"),
      ).length,
    },
  });

  return {
    calendar_url: calendarUrl,
    calendar_synced: calendarStatus === "synced",
    confirmation_sent: confirmationSent,
  };
}
