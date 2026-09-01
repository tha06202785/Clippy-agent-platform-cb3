import { recordClippyActivity } from "@/lib/activity-log";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  filterCalendarItemsForImport,
  filterGmailItemsForImport,
  importGmailLeads,
  indexGoogleItems,
  type GoogleKnowledgeItem,
} from "@/lib/integrations/google-sync";
import { getIntegrationAccount } from "@/lib/integrations/integration-accounts";
import { refreshMicrosoftCredentials } from "@/lib/integrations/microsoft-graph";

type GraphEmail = {
  id?: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  from?: { emailAddress?: { address?: string; name?: string } };
  receivedDateTime?: string;
  lastModifiedDateTime?: string;
  internetMessageHeaders?: Array<{ name?: string; value?: string }>;
};

type GraphEvent = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  organizer?: { emailAddress?: { address?: string; name?: string } };
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    status?: { response?: string };
  }>;
  lastModifiedDateTime?: string;
  isCancelled?: boolean;
};

function plainText(value?: string) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8_000);
}

async function graphJson<T>(url: URL, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
  });
  if (!response.ok) {
    throw new Error(`Microsoft Graph request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function fetchOutlookMail(accountId: string, accessToken: string) {
  const url = new URL(
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
  );
  url.searchParams.set("$top", "20");
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set(
    "$select",
    "id,conversationId,subject,bodyPreview,body,from,receivedDateTime,lastModifiedDateTime,internetMessageHeaders",
  );
  const payload = await graphJson<{ value?: GraphEmail[] }>(url, accessToken);
  return (payload.value || []).flatMap((message): GoogleKnowledgeItem[] => {
    if (!message.id) return [];
    const address = message.from?.emailAddress?.address || "";
    const name = message.from?.emailAddress?.name || "";
    const body = plainText(message.body?.content || message.bodyPreview);
    const externalId = `${accountId}:${message.id}`;
    const threadId = `${accountId}:${message.conversationId || message.id}`;
    const headers = Object.fromEntries(
      (message.internetMessageHeaders || []).map((header) => [
        String(header.name || "").toLowerCase(),
        header.value || "",
      ]),
    );
    return [
      {
        externalId,
        revision:
          message.lastModifiedDateTime || message.receivedDateTime || externalId,
        source: "email",
        title: message.subject?.trim() || "(No subject)",
        content: `${message.subject || "(No subject)"}\n${body}`,
        metadata: {
          integration_provider: "microsoft",
          microsoft_message_id: message.id,
          microsoft_conversation_id: message.conversationId || null,
          email_address: address,
          sender_name: name,
          from: name ? `${name} <${address}>` : address,
          body,
          thread_id: threadId,
          list_unsubscribe: headers["list-unsubscribe"] || null,
          list_id: headers["list-id"] || null,
          precedence: headers.precedence || null,
          auto_submitted: headers["auto-submitted"] || null,
        },
      },
    ];
  });
}

async function fetchOutlookCalendar(accountId: string, accessToken: string) {
  const now = Date.now();
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set(
    "startDateTime",
    new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  url.searchParams.set(
    "endDateTime",
    new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
  );
  url.searchParams.set("$top", "50");
  url.searchParams.set(
    "$select",
    "id,subject,bodyPreview,body,start,end,location,organizer,attendees,lastModifiedDateTime,isCancelled",
  );
  const payload = await graphJson<{ value?: GraphEvent[] }>(url, accessToken);
  return (payload.value || []).flatMap((event): GoogleKnowledgeItem[] => {
    if (!event.id || event.isCancelled) return [];
    const externalId = `${accountId}:${event.id}`;
    const title = event.subject?.trim() || "(Untitled calendar event)";
    const attendees = (event.attendees || [])
      .map((attendee) => attendee.emailAddress?.address)
      .filter(Boolean);
    return [
      {
        externalId,
        revision: event.lastModifiedDateTime || externalId,
        source: "calendar",
        title,
        content: [
          `Calendar event: ${title}`,
          `Starts: ${event.start?.dateTime || "Unknown"}`,
          `Ends: ${event.end?.dateTime || "Unknown"}`,
          event.location?.displayName
            ? `Location: ${event.location.displayName}`
            : "",
          event.organizer?.emailAddress?.address
            ? `Organiser: ${event.organizer.emailAddress.address}`
            : "",
          attendees.length ? `Attendees: ${attendees.join(", ")}` : "",
          plainText(event.body?.content || event.bodyPreview),
        ]
          .filter(Boolean)
          .join("\n")
          .slice(0, 8_000),
        metadata: {
          integration_provider: "microsoft",
          microsoft_event_id: event.id,
          starts_at: event.start?.dateTime || null,
          ends_at: event.end?.dateTime || null,
          location: event.location?.displayName || null,
          organizer_email: event.organizer?.emailAddress?.address || null,
          attendee_emails: attendees,
          updated_at: event.lastModifiedDateTime || null,
        },
      },
    ];
  });
}

export async function syncMicrosoftKnowledge(
  orgId: string,
  userId: string,
  integrationAccountId: string,
) {
  const admin = createAdminClient();
  const account = await getIntegrationAccount({
    admin,
    orgId,
    accountId: integrationAccountId,
    resourceType: "mail",
    capability: "sync",
  });
  if (!account || account.provider !== "microsoft") {
    throw new Error("Connected Microsoft 365 account was not found");
  }
  const credentials = await refreshMicrosoftCredentials(admin, account);
  if (!credentials.access_token) {
    throw new Error("Microsoft 365 access token is missing");
  }

  const [mailCandidates, calendarCandidates] = await Promise.all([
    fetchOutlookMail(account.id, credentials.access_token),
    fetchOutlookCalendar(account.id, credentials.access_token),
  ]);
  const [mailItems, calendarItems] = await Promise.all([
    filterGmailItemsForImport(admin, orgId, mailCandidates),
    filterCalendarItemsForImport(admin, orgId, calendarCandidates),
  ]);
  const [mail, calendar] = await Promise.all([
    importGmailLeads(admin, orgId, mailItems, account.id),
    indexGoogleItems(
      admin,
      orgId,
      userId,
      "calendar",
      calendarItems,
      account.id,
    ),
  ]);
  const now = new Date().toISOString();
  await Promise.all([
    admin
      .from("integration_accounts")
      .update({ last_sync_at: now, last_error: null, updated_at: now })
      .eq("id", account.id)
      .eq("org_id", orgId),
    admin
      .from("integration_resources")
      .update({
        status: "connected",
        last_sync_at: now,
        last_error: null,
        updated_at: now,
      })
      .eq("integration_account_id", account.id)
      .eq("org_id", orgId),
  ]);
  if (mail.indexed > 0) {
    await recordClippyActivity(admin, {
      orgId,
      userId,
      action: "outlook_enquiries_synced",
      category: "communication",
      title: "Outlook enquiries synced",
      description: `${mail.indexed} new real-estate enquiries were imported from Outlook.`,
      impactSummary: "New enquiry records are ready for review and response",
      metadata: { integration_account_id: account.id },
    });
  }
  return {
    gmail: mail,
    calendar,
    learning: {
      scanned: 0,
      learned: 0,
      backfillComplete: true,
      messageHistory: { processed: 0, learned: 0, preferences: 0 },
    },
  };
}
