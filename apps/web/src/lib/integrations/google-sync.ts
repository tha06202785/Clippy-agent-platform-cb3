import { createAdminClient } from "@/lib/supabase/admin";
import { recordClippyActivity } from "@/lib/activity-log";
import { resolveOrCreateLead } from "@/lib/leads/resolve-or-create";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "@/lib/integration-credentials";
import {
  chunkKnowledge,
  embedKnowledge,
  KNOWLEDGE_EMBEDDING_MODEL,
} from "@/lib/knowledge-indexing";
import { getGoogleOAuthConfig } from "@/lib/google-oauth-config";
import {
  getLearningSettings,
  learnFromStoredMessages,
  refreshAgentVoiceProfile,
  resanitiseStoredCommunicationExamples,
  storeCommunicationExample,
} from "@/lib/adaptive-learning";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const MAX_EMAILS_PER_SYNC = 20;
const MAX_SENT_EMAILS_PER_SYNC = 50;
const MAX_EVENTS_PER_SYNC = 50;
const MAX_ITEM_CONTENT = 8_000;
const GMAIL_FETCH_CONCURRENCY = 4;
const GOOGLE_API_MAX_ATTEMPTS = 4;
// Re-read a wider recent window so messages that were temporarily filtered,
// delayed by Gmail, or received during a deployment are not permanently lost.
// Existing-message checks keep this retry window idempotent.
const SYNC_OVERLAP_MS = 30 * 60 * 1000;
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const requestedConcurrency = Number.isFinite(concurrency)
    ? Math.floor(concurrency)
    : 1;
  const workerCount = Math.min(items.length, Math.max(1, requestedConcurrency));
  const results = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}
const REAL_ESTATE_TERMS = [
  "property",
  "inspection",
  "inspect",
  "open home",
  "open house",
  "listing",
  "buyer",
  "buying",
  "vendor",
  "selling",
  "rental",
  "rent",
  "lease",
  "tenant",
  "apartment",
  "townhouse",
  "auction",
  "offer",
  "real estate",
  "enquiry",
  "inquiry",
  "domain.com.au",
  "realestate.com.au",
];
const NON_LEAD_TERMS = [
  "unsubscribe",
  "newsletter",
  "receipt",
  "invoice",
  "security alert",
  "password",
  "verification code",
  "one-time code",
  "order confirmation",
  "delivery update",
  "statement available",
  "marketing preferences",
  "manage preferences",
  "email preferences",
  "view in browser",
  "view this email",
  "read online",
  "weekly digest",
  "issue #",
];
const LEAD_INTENT_TERMS = [
  "i'm interested",
  "i am interested",
  "interested in",
  "would like to inspect",
  "book an inspection",
  "arrange an inspection",
  "request an inspection",
  "inspection still available",
  "available for inspection",
  "make an offer",
  "want to buy",
  "want to rent",
  "looking to buy",
  "looking to rent",
  "enquiring about",
  "inquiring about",
  "contact me",
];
const LEAD_SUBJECT_TERMS = [
  "enquiry",
  "inquiry",
  "inspection",
  "buyer",
  "rental application",
  "offer",
];
const LEAD_FOLLOW_UP_TERMS = [
  "confirmation",
  "confirm my",
  "didn't get",
  "didn’t get",
  "did not get",
  "haven't received",
  "haven’t received",
  "have not received",
  "not received",
  "waiting for",
  "please resend",
];

type AdminClient = ReturnType<typeof createAdminClient>;

export type GoogleCredentials = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type GoogleKnowledgeItem = {
  externalId: string;
  revision: string;
  source: "email" | "calendar";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
};

type CalendarEvent = {
  id?: string;
  etag?: string;
  updated?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  organizer?: { email?: string; displayName?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
};

export type GoogleSyncResult = {
  gmail: { indexed: number; unchanged: number; total: number };
  calendar: { indexed: number; unchanged: number; total: number };
  learning: {
    scanned: number;
    learned: number;
    backfillComplete: boolean;
    messageHistory: {
      processed: number;
      learned: number;
      preferences: number;
    };
  };
};

function decodeBase64Url(value?: string): string {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(
      /<div[^>]+class=["'][^"']*gmail_quote[^"']*["'][^>]*>[\s\S]*$/gi,
      " ",
    )
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findGmailPart(part: GmailPart | undefined, mimeType: string): string {
  if (!part) return "";
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data).trim();
  }
  return (part.parts || [])
    .map((child) => findGmailPart(child, mimeType))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function extractGmailText(part?: GmailPart): string {
  const plain = findGmailPart(part, "text/plain");
  if (plain) return stripQuotedReply(plain);
  return stripQuotedReply(stripHtml(findGmailPart(part, "text/html")));
}

export function stripQuotedReply(value: string): string {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^On .+wrote:$/i.test(trimmed) ||
      /^-{2,}\s*(?:Original Message|Forwarded message)\s*-{2,}$/i.test(
        trimmed,
      ) ||
      /^_{5,}$/.test(trimmed) ||
      (/^From:\s.+/i.test(trimmed) && kept.some((item) => item.trim() === ""))
    )
      break;
    if (/^>/.test(trimmed)) continue;
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function gmailHeader(message: GmailMessage, name: string): string {
  return (
    message.payload?.headers
      ?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value?.trim() || ""
  );
}

export function gmailMessageToKnowledge(
  message: GmailMessage,
): GoogleKnowledgeItem | null {
  if (!message.id) return null;
  const subject = gmailHeader(message, "Subject") || "(No subject)";
  const body = extractGmailText(message.payload) || message.snippet || "";
  if (!body.trim()) return null;

  const from = gmailHeader(message, "From");
  const to = gmailHeader(message, "To");
  const date = gmailHeader(message, "Date");
  const content = [
    `Email subject: ${subject}`,
    from ? `From: ${from}` : "",
    to ? `To: ${to}` : "",
    date ? `Date: ${date}` : "",
    "",
    body,
  ]
    .filter((line) => line !== "")
    .join("\n")
    .slice(0, MAX_ITEM_CONTENT);

  return {
    externalId: message.id,
    revision: message.internalDate || message.id,
    source: "email",
    title: subject.slice(0, 300),
    content,
    metadata: {
      google_resource_id: message.id,
      thread_id: message.threadId || null,
      from: from || null,
      to: to || null,
      email_date: date || null,
      email_address: extractEmailAddress(from),
      sender_name: extractSenderName(from),
      body,
    },
  };
}

function extractEmailAddress(from: string): string {
  const match =
    from.match(/<([^>]+)>/) ||
    from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (match?.[1] || match?.[0] || "").toLowerCase().trim();
}

function extractSenderName(from: string): string | null {
  const name = from
    .replace(/<[^>]+>/, "")
    .replace(/^"|"$/g, "")
    .trim();
  return name && !name.includes("@") ? name : null;
}

export function extractLeadName(
  body: string,
  senderName?: string | null,
): string | null {
  const explicit =
    body.match(
      /\b(?:I['’]m|I am|My name is)\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,2})\b/,
    )?.[1] ||
    body.match(
      /(?:^|\n)\s*Name:\s*([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,2})\b/,
    )?.[1];
  return explicit?.trim() || senderName?.trim() || null;
}

export function extractLeadPhone(body: string): string | null {
  const match = body.match(
    /(?:\+?61\s?4|04)(?:[\s.-]?\d){8}\b|(?:\+?61\s?[2378]|0[2378])(?:[\s.-]?\d){8}\b/,
  )?.[0];
  return match?.replace(/\s+/g, " ").trim() || null;
}

export function extractPropertyAddress(body: string): string | null {
  const match = body.match(
    /\b(\d{1,6}\s+[A-Za-z0-9'’-]+(?:\s+[A-Za-z0-9'’-]+){0,7}\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Crescent|Cres|Lane|Ln|Place|Pl|Parade|Pde|Boulevard|Blvd|Highway|Hwy|Way|Terrace|Tce)(?:,\s*[A-Za-z][A-Za-z'’ -]{1,40})?)(?=[.!?\n]|\s+(?:and|for|this|on|to|please|would|is|at)\b|$)/i,
  )?.[1];
  return match?.replace(/\s+/g, " ").replace(/,$/, "").trim() || null;
}

function normaliseAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\broad\b/g, "rd")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bcrescent\b/g, "cres")
    .replace(/\blane\b/g, "ln")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bparade\b/g, "pde")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bhighway\b/g, "hwy")
    .replace(/\bterrace\b/g, "tce")
    .replace(/[^a-z0-9]/g, "");
}

async function resolveGmailEnquiry({
  admin,
  orgId,
  leadId,
  threadId,
  subject,
  body,
}: {
  admin: AdminClient;
  orgId: string;
  leadId: string;
  threadId: string;
  subject: string;
  body: string;
}) {
  const propertyAddress = extractPropertyAddress(body);
  let listingId: string | null = null;
  if (propertyAddress) {
    const { data: listings } = await admin
      .from("listings")
      .select("id,address")
      .eq("org_id", orgId)
      .limit(200);
    const target = normaliseAddress(propertyAddress);
    listingId =
      listings?.find(
        (listing) => normaliseAddress(listing.address || "") === target,
      )?.id || null;
  }

  const { data: existing } = await admin
    .from("property_enquiries")
    .select("id,listing_id,metadata")
    .eq("org_id", orgId)
    .eq("source", "gmail")
    .eq("external_enquiry_id", threadId)
    .maybeSingle();
  const now = new Date().toISOString();
  const existingMetadata =
    existing?.metadata && typeof existing.metadata === "object"
      ? existing.metadata
      : {};
  const metadata = {
    ...existingMetadata,
    subject,
    ...(propertyAddress ? { property_address: propertyAddress } : {}),
    inspection_intent: /\b(?:inspect|inspection|open home|open house)\b/i.test(
      body,
    ),
  };

  if (existing?.id) {
    const resolvedListingId = existing.listing_id || listingId;
    await admin
      .from("property_enquiries")
      .update({
        listing_id: resolvedListingId,
        last_activity_at: now,
        updated_at: now,
        metadata,
      })
      .eq("id", existing.id)
      .eq("org_id", orgId);
    return { enquiryId: existing.id, listingId: resolvedListingId };
  }

  const { data: created, error } = await admin
    .from("property_enquiries")
    .insert({
      org_id: orgId,
      lead_id: leadId,
      listing_id: listingId,
      source: "gmail",
      external_enquiry_id: threadId,
      status: "active",
      metadata,
    })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(`Property enquiry creation failed: ${error?.code}`);
  }
  return { enquiryId: created.id, listingId };
}

export function isLikelyRealEstateLead(item: GoogleKnowledgeItem): boolean {
  if (item.source !== "email") return false;
  const email = String(item.metadata.email_address || "");
  const subject = item.title.toLowerCase();
  const content = `${item.title} ${item.content}`.toLowerCase();
  if (!email) return false;

  const trustedPortal = /@(domain\.com\.au|realestate\.com\.au)$/i.test(email);
  const automatedSender = /^(no-?reply|notifications?|mailer-daemon)@/i.test(
    email,
  );
  if (automatedSender && !trustedPortal) return false;
  if (NON_LEAD_TERMS.some((term) => content.includes(term))) return false;

  const hasIntent = LEAD_INTENT_TERMS.some((term) => content.includes(term));
  const hasRealEstateContext = REAL_ESTATE_TERMS.some((term) =>
    content.includes(term),
  );
  const subjectLooksLikeLead = LEAD_SUBJECT_TERMS.some((term) =>
    subject.includes(term),
  );
  const hasFollowUpIntent = LEAD_FOLLOW_UP_TERMS.some((term) =>
    content.includes(term),
  );
  const linkCount = content.match(/https?:\/\//g)?.length || 0;
  if (linkCount >= 3 && !hasIntent && !trustedPortal) return false;

  return (
    hasIntent ||
    (hasFollowUpIntent && hasRealEstateContext) ||
    (subjectLooksLikeLead && hasRealEstateContext) ||
    (trustedPortal && hasRealEstateContext)
  );
}

export function calendarEventToKnowledge(
  event: CalendarEvent,
): GoogleKnowledgeItem | null {
  if (!event.id || event.status === "cancelled") return null;
  const title = event.summary?.trim() || "(Untitled calendar event)";
  const attendees = (event.attendees || [])
    .slice(0, 20)
    .map((attendee) => {
      const identity = attendee.displayName || attendee.email;
      return identity
        ? `${identity}${attendee.responseStatus ? ` (${attendee.responseStatus})` : ""}`
        : "";
    })
    .filter(Boolean);
  const content = [
    `Calendar event: ${title}`,
    `Starts: ${event.start?.dateTime || event.start?.date || "Unknown"}`,
    `Ends: ${event.end?.dateTime || event.end?.date || "Unknown"}`,
    event.location ? `Location: ${event.location}` : "",
    event.organizer?.email
      ? `Organiser: ${event.organizer.displayName || event.organizer.email}`
      : "",
    attendees.length ? `Attendees: ${attendees.join(", ")}` : "",
    event.description ? `Notes: ${event.description}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_ITEM_CONTENT);

  return {
    externalId: event.id,
    revision: event.updated || event.etag || event.id,
    source: "calendar",
    title: title.slice(0, 300),
    content,
    metadata: {
      google_resource_id: event.id,
      starts_at: event.start?.dateTime || event.start?.date || null,
      ends_at: event.end?.dateTime || event.end?.date || null,
      location: event.location || null,
      updated_at: event.updated || null,
    },
  };
}

export async function refreshGoogleCredentials(
  admin: AdminClient,
  orgId: string,
  credentials: GoogleCredentials,
): Promise<GoogleCredentials> {
  if (!credentials.refresh_token) {
    if (!credentials.access_token) {
      throw new Error("Google access token is missing; reconnect Google");
    }
    return credentials;
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  const refreshed = (await response.json()) as GoogleCredentials;
  const merged: GoogleCredentials = {
    ...credentials,
    ...refreshed,
    refresh_token: refreshed.refresh_token || credentials.refresh_token,
  };
  const credentialsEncrypted = encryptIntegrationCredentials(merged);
  const { error } = await admin
    .from("integrations")
    .update({
      credentials_encrypted: credentialsEncrypted,
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("org_id", orgId)
    .in("provider", ["gmail", "google-calendar"]);
  if (error)
    throw new Error(`Unable to store refreshed Google token: ${error.code}`);
  return merged;
}

async function googleJson<T>(url: URL, accessToken: string): Promise<T> {
  const service = url.hostname.startsWith("gmail")
    ? "Gmail"
    : "Google Calendar";

  for (let attempt = 0; attempt < GOOGLE_API_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) return (await response.json()) as T;

    const responseText = await response.text();
    let reason = "";
    let message = "";

    try {
      const payload = JSON.parse(responseText) as {
        error?: {
          message?: string;
          status?: string;
          errors?: Array<{ reason?: string }>;
          details?: Array<{ reason?: string }>;
        };
      };
      reason =
        payload.error?.status ||
        payload.error?.errors?.[0]?.reason ||
        payload.error?.details?.[0]?.reason ||
        "";
      message = payload.error?.message || "";
    } catch {
      message = responseText.slice(0, 200);
    }

    const detail = [reason && `[${reason}]`, message].filter(Boolean).join(" ");
    const error = new Error(
      `${service} API request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
    const retryable =
      response.status === 429 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;
    if (!retryable || attempt === GOOGLE_API_MAX_ATTEMPTS - 1) throw error;

    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    const retryAfterMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1_000
      : 0;
    const delayMs = Math.min(5_000, Math.max(retryAfterMs, 400 * 2 ** attempt));
    console.warn("Google API request throttled; retrying", {
      service,
      status: response.status,
      attempt: attempt + 1,
      delayMs,
    });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`${service} API request failed after retries`);
}

async function fetchGmailItems(
  accessToken: string,
  lastSyncAt?: string | null,
): Promise<GoogleKnowledgeItem[]> {
  const listUrl = new URL(`${GMAIL_API}/users/me/messages`);
  listUrl.searchParams.set("maxResults", String(MAX_EMAILS_PER_SYNC));
  const after = lastSyncAt
    ? Math.floor((new Date(lastSyncAt).getTime() - SYNC_OVERLAP_MS) / 1000)
    : null;
  listUrl.searchParams.set(
    "q",
    `in:inbox ${after ? `after:${after}` : "newer_than:30d"} -category:promotions -category:social -category:spam -category:trash`,
  );
  const list = await googleJson<{
    messages?: Array<{ id?: string }>;
  }>(listUrl, accessToken);

  const messages = await mapWithConcurrency(
    list.messages || [],
    GMAIL_FETCH_CONCURRENCY,
    async ({ id }) => {
      if (!id) return null;
      const messageUrl = new URL(`${GMAIL_API}/users/me/messages/${id}`);
      messageUrl.searchParams.set("format", "full");
      return googleJson<GmailMessage>(messageUrl, accessToken);
    },
  );
  return messages
    .map((message) => (message ? gmailMessageToKnowledge(message) : null))
    .filter((item): item is GoogleKnowledgeItem => Boolean(item))
    .filter(isLikelyRealEstateLead);
}

async function syncGmailSentLearning(
  admin: AdminClient,
  orgId: string,
  userId: string,
  accessToken: string,
) {
  const settings = await getLearningSettings(admin, orgId, userId);
  if (!settings?.learning_enabled || !settings.learn_from_sent) {
    return {
      scanned: 0,
      learned: 0,
      backfillComplete: Boolean(settings?.sent_backfill_complete),
    };
  }
  if (settings.excluded_channels.includes("email")) {
    return {
      scanned: 0,
      learned: 0,
      backfillComplete: settings.sent_backfill_complete,
    };
  }

  const isBackfill = !settings.sent_backfill_complete;
  const listUrl = new URL(`${GMAIL_API}/users/me/messages`);
  listUrl.searchParams.set("maxResults", String(MAX_SENT_EMAILS_PER_SYNC));
  listUrl.searchParams.set("labelIds", "SENT");
  if (settings.sent_page_token) {
    listUrl.searchParams.set("pageToken", settings.sent_page_token);
  }
  if (isBackfill) {
    listUrl.searchParams.set("q", "newer_than:180d -in:trash");
  } else {
    const after = settings.last_sent_sync_at
      ? Math.floor(
          (new Date(settings.last_sent_sync_at).getTime() - SYNC_OVERLAP_MS) /
            1000,
        )
      : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    listUrl.searchParams.set("q", `after:${after} -in:trash`);
  }

  const list = await googleJson<{
    messages?: Array<{ id?: string; threadId?: string }>;
    nextPageToken?: string;
  }>(listUrl, accessToken);
  const gmailMessages = await mapWithConcurrency(
    list.messages || [],
    GMAIL_FETCH_CONCURRENCY,
    async ({ id }) => {
      if (!id) return null;
      const messageUrl = new URL(`${GMAIL_API}/users/me/messages/${id}`);
      messageUrl.searchParams.set("format", "full");
      return googleJson<GmailMessage>(messageUrl, accessToken);
    },
  );

  const threadIds = Array.from(
    new Set(
      gmailMessages
        .map((message) => message?.threadId)
        .filter((threadId): threadId is string => Boolean(threadId)),
    ),
  );
  const { data: conversations, error: conversationError } = threadIds.length
    ? await admin
        .from("conversations")
        .select("id,lead_id,external_thread_id")
        .eq("org_id", orgId)
        .in("external_thread_id", threadIds)
    : { data: [], error: null };
  if (conversationError) {
    throw new Error(
      `Sent-message conversation lookup failed: ${conversationError.message}`,
    );
  }
  const conversationByThread = new Map(
    (conversations || []).map((conversation) => [
      conversation.external_thread_id,
      conversation,
    ]),
  );

  let learned = 0;
  for (const message of gmailMessages) {
    if (!message?.id) continue;
    const body = extractGmailText(message.payload) || message.snippet || "";
    if (!body.trim()) continue;
    const subject = gmailHeader(message, "Subject") || "(No subject)";
    const to = gmailHeader(message, "To");
    const conversation = message.threadId
      ? conversationByThread.get(message.threadId)
      : null;
    const stored = await storeCommunicationExample({
      supabase: admin,
      orgId,
      userId,
      content: body,
      subject,
      source: "gmail_sent",
      sourceMessageId: message.id,
      channel: "email",
      leadId: conversation?.lead_id || null,
      conversationId: conversation?.id || null,
      occurredAt: message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : new Date().toISOString(),
      names: [extractSenderName(to)],
      qualityScore: 1,
      metadata: {
        gmail_thread_id: message.threadId || null,
        import_window: isBackfill ? "historical_180d" : "incremental",
      },
    });
    if (stored) learned += 1;
  }

  const now = new Date().toISOString();
  const nextPageToken = list.nextPageToken || null;
  const backfillComplete = isBackfill ? !nextPageToken : true;
  const { error: settingsError } = await admin
    .from("communication_learning_settings")
    .update({
      sent_page_token: nextPageToken,
      sent_backfill_complete: backfillComplete,
      ...(!nextPageToken ? { last_sent_sync_at: now } : {}),
      updated_at: now,
    })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (settingsError) {
    throw new Error(
      `Sent-message learning cursor failed: ${settingsError.message}`,
    );
  }
  if (learned > 0) await refreshAgentVoiceProfile(admin, orgId, userId);
  return {
    scanned: gmailMessages.filter(Boolean).length,
    learned,
    backfillComplete,
  };
}

async function importGmailLeads(
  admin: AdminClient,
  orgId: string,
  items: GoogleKnowledgeItem[],
) {
  let imported = 0;
  let unchanged = 0;
  for (const item of items) {
    const { data: existingMessage } = await admin
      .from("messages")
      .select("id")
      .eq("org_id", orgId)
      .contains("raw_json", { external_message_id: item.externalId })
      .limit(1)
      .maybeSingle();
    if (existingMessage) {
      unchanged += 1;
      continue;
    }

    const email = String(item.metadata.email_address || "");
    if (!email) continue;
    const body = String(item.metadata.body || "");
    const detectedName = extractLeadName(
      body,
      String(item.metadata.sender_name || "") || null,
    );
    const detectedPhone = extractLeadPhone(body);
    const leadId = await resolveOrCreateLead({
      supabase: admin,
      orgId,
      channel: "email",
      identity: email,
      name: detectedName,
    });
    await admin
      .from("leads")
      .update({
        ...(detectedName ? { full_name: detectedName } : {}),
        ...(detectedPhone ? { phone: detectedPhone } : {}),
        email,
        source: "email",
        stage: "new",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("org_id", orgId);
    const lead = { id: leadId };

    const threadId = String(item.metadata.thread_id || item.externalId);
    const { enquiryId, listingId } = await resolveGmailEnquiry({
      admin,
      orgId,
      leadId,
      threadId,
      subject: item.title,
      body,
    });
    let { data: conversation } = await admin
      .from("conversations")
      .select("id")
      .eq("org_id", orgId)
      .eq("channel", "email")
      .eq("external_thread_id", threadId)
      .limit(1)
      .maybeSingle();
    if (!conversation) {
      const created = await admin
        .from("conversations")
        .insert({
          org_id: orgId,
          lead_id: lead.id,
          channel: "email",
          external_thread_id: threadId,
          enquiry_id: enquiryId,
          listing_id: listingId,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (created.error || !created.data)
        throw new Error(
          `Gmail conversation creation failed: ${created.error?.code}`,
        );
      conversation = created.data;
    }
    const { error: messageError } = await admin.from("messages").insert({
      org_id: orgId,
      conversation_id: conversation.id,
      direction_in_out: "in",
      text: body || item.content,
      read_at: null,
      raw_json: {
        channel: "email",
        external_message_id: item.externalId,
        subject: item.title,
        from: item.metadata.from,
        gmail_thread_id: threadId,
      },
    });
    if (messageError)
      throw new Error(`Gmail message import failed: ${messageError.code}`);
    const replyReceivedAt = new Date().toISOString();
    await Promise.all([
      admin
        .from("scheduled_communications")
        .update({
          status: "cancelled",
          cancelled_at: replyReceivedAt,
          updated_at: replyReceivedAt,
          last_error: "Cancelled because the client replied",
        })
        .eq("org_id", orgId)
        .eq("lead_id", leadId)
        .eq("type", "no_response_follow_up")
        .in("status", ["scheduled", "awaiting_approval"]),
      admin
        .from("automation_approvals")
        .update({
          status: "expired",
          reason: "Client replied before this follow-up was sent",
          updated_at: replyReceivedAt,
        })
        .eq("org_id", orgId)
        .eq("lead_id", leadId)
        .eq("action_key", "no_response_follow_up")
        .eq("status", "pending"),
    ]);
    await admin
      .from("conversations")
      .update({
        enquiry_id: enquiryId,
        listing_id: listingId,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
    imported += 1;
  }
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .contains("raw_json", { channel: "email" });
  return { indexed: imported, unchanged, total: count || 0 };
}

async function fetchCalendarItems(
  accessToken: string,
): Promise<GoogleKnowledgeItem[]> {
  const now = Date.now();
  const listUrl = new URL(`${CALENDAR_API}/calendars/primary/events`);
  listUrl.searchParams.set(
    "timeMin",
    new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  listUrl.searchParams.set(
    "timeMax",
    new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
  );
  listUrl.searchParams.set("singleEvents", "true");
  listUrl.searchParams.set("orderBy", "startTime");
  listUrl.searchParams.set("maxResults", String(MAX_EVENTS_PER_SYNC));
  const list = await googleJson<{ items?: CalendarEvent[] }>(
    listUrl,
    accessToken,
  );
  return (list.items || [])
    .map(calendarEventToKnowledge)
    .filter((item): item is GoogleKnowledgeItem => Boolean(item));
}

async function indexGoogleItems(
  admin: AdminClient,
  orgId: string,
  userId: string,
  source: "email" | "calendar",
  items: GoogleKnowledgeItem[],
) {
  if (!items.length) {
    const { count } = await admin
      .from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("source", source)
      .eq("status", "indexed");
    return { indexed: 0, unchanged: 0, total: count || 0 };
  }

  const { data: existing, error: existingError } = await admin
    .from("knowledge_documents")
    .select("id,external_id,external_revision")
    .eq("org_id", orgId)
    .eq("source", source)
    .in(
      "external_id",
      items.map((item) => item.externalId),
    );
  if (existingError)
    throw new Error(`Knowledge lookup failed: ${existingError.code}`);

  const existingById = new Map(
    (existing || []).map((document) => [document.external_id, document]),
  );
  const changed = items.filter(
    (item) =>
      existingById.get(item.externalId)?.external_revision !== item.revision,
  );
  const unchanged = items.length - changed.length;
  if (!changed.length) {
    const { count } = await admin
      .from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("source", source)
      .eq("status", "indexed");
    return { indexed: 0, unchanged, total: count || 0 };
  }

  const prepared = changed.map((item) => ({
    item,
    chunks: chunkKnowledge(item.content),
  }));
  const allChunks = prepared.flatMap(({ chunks }) => chunks);
  const embeddings = await embedKnowledge(allChunks);
  let embeddingOffset = 0;
  let indexed = 0;

  for (const { item, chunks } of prepared) {
    const itemEmbeddings = embeddings.slice(
      embeddingOffset,
      embeddingOffset + chunks.length,
    );
    embeddingOffset += chunks.length;

    const { data: document, error: documentError } = await admin
      .from("knowledge_documents")
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          layer: "agency_private",
          source,
          external_id: item.externalId,
          external_revision: item.revision,
          title: item.title,
          content: item.content,
          source_metadata: item.metadata,
          embedding_model: KNOWLEDGE_EMBEDDING_MODEL,
          status: "processing",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,source,external_id" },
      )
      .select("id")
      .single();
    if (documentError || !document) {
      throw new Error(
        `Knowledge document upsert failed: ${documentError?.code}`,
      );
    }

    const { error: deleteError } = await admin
      .from("knowledge_chunks")
      .delete()
      .eq("document_id", document.id);
    if (deleteError)
      throw new Error(`Knowledge chunk cleanup failed: ${deleteError.code}`);

    const { error: chunkError } = await admin.from("knowledge_chunks").insert(
      chunks.map((content, index) => ({
        document_id: document.id,
        chunk_index: index,
        content,
        embedding: itemEmbeddings[index],
        metadata: {
          source,
          external_id: item.externalId,
          chunk_size: content.split(/\s+/).length,
        },
      })),
    );
    if (chunkError) {
      await admin
        .from("knowledge_documents")
        .update({ status: "failed", health: "error" })
        .eq("id", document.id);
      throw new Error(`Knowledge chunk insert failed: ${chunkError.code}`);
    }

    const { error: indexedError } = await admin
      .from("knowledge_documents")
      .update({
        status: "indexed",
        health: "healthy",
        indexed_at: new Date().toISOString(),
        chunk_count: chunks.length,
        word_count: item.content.split(/\s+/).length,
      })
      .eq("id", document.id);
    if (indexedError)
      throw new Error(`Knowledge indexing failed: ${indexedError.code}`);
    indexed += 1;
  }

  const { count } = await admin
    .from("knowledge_documents")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("source", source)
    .eq("status", "indexed");
  return { indexed, unchanged, total: count || 0 };
}

async function updateHealth(
  admin: AdminClient,
  orgId: string,
  provider: "gmail" | "google-calendar",
  result: { indexed: number; unchanged: number; total: number },
  startedAt: number,
) {
  const now = new Date();
  const nextSync = new Date(now.getTime() + AUTO_SYNC_INTERVAL_MS);
  const healthRecord = {
    org_id: orgId,
    provider,
    status: "healthy",
    last_sync_at: now.toISOString(),
    next_sync_at: nextSync.toISOString(),
    items_indexed: result.total,
    sync_duration_ms: Date.now() - startedAt,
    errors_count: 0,
    last_error: null,
    activity_summary: {
      indexed_this_sync: result.indexed,
      unchanged_this_sync: result.unchanged,
    },
    updated_at: now.toISOString(),
  };
  const { error: healthError } = await admin
    .from("integration_health")
    .upsert(healthRecord, { onConflict: "org_id,provider" });
  if (healthError)
    throw new Error(`Integration health update failed: ${healthError.code}`);

  const { error: integrationError } = await admin
    .from("integrations")
    .update({
      status: "connected",
      last_sync_at: now.toISOString(),
      items_indexed: result.total,
      activity_summary: healthRecord.activity_summary,
      last_error: null,
      updated_at: now.toISOString(),
    })
    .eq("org_id", orgId)
    .eq("provider", provider);
  if (integrationError) {
    throw new Error(
      `Integration status update failed: ${integrationError.code}`,
    );
  }
}

export async function syncGoogleKnowledge(
  orgId: string,
  userId: string,
): Promise<GoogleSyncResult> {
  const admin = createAdminClient();
  const startedAt = Date.now();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("credentials_encrypted,last_sync_at")
    .eq("org_id", orgId)
    .eq("provider", "gmail")
    .eq("status", "connected")
    .maybeSingle();
  if (error || !integration?.credentials_encrypted) {
    throw new Error("Connected Gmail credentials were not found");
  }

  const stored = decryptIntegrationCredentials<GoogleCredentials>(
    integration.credentials_encrypted,
  );
  const credentials = await refreshGoogleCredentials(admin, orgId, stored);
  if (!credentials.access_token)
    throw new Error("Google access token is missing");

  const [gmailItems, calendarItems] = await Promise.all([
    fetchGmailItems(credentials.access_token, integration.last_sync_at),
    fetchCalendarItems(credentials.access_token),
  ]);
  // Keep Gmail inbox and Sent scans sequential so their bounded worker pools
  // cannot combine into a per-user request spike.
  const learning = await syncGmailSentLearning(
    admin,
    orgId,
    userId,
    credentials.access_token,
  );
  const [gmail, calendar] = await Promise.all([
    importGmailLeads(admin, orgId, gmailItems),
    indexGoogleItems(admin, orgId, userId, "calendar", calendarItems),
  ]);
  await resanitiseStoredCommunicationExamples(admin, orgId, userId);
  const messageHistory = await learnFromStoredMessages(admin, orgId, userId);
  await Promise.all([
    updateHealth(admin, orgId, "gmail", gmail, startedAt),
    updateHealth(admin, orgId, "google-calendar", calendar, startedAt),
  ]);
  if (gmail.indexed > 0) {
    await recordClippyActivity(admin, {
      orgId,
      userId,
      action: "gmail_enquiries_synced",
      category: "communication",
      title: "Gmail enquiries synced",
      description: `${gmail.indexed} new real-estate enquir${gmail.indexed === 1 ? "y was" : "ies were"} imported from Gmail.`,
      impactSummary: "New enquiry records are ready for review and response",
      metadata: {
        imported_this_sync: gmail.indexed,
        total_gmail_messages: gmail.total,
      },
    });
  }
  return { gmail, calendar, learning: { ...learning, messageHistory } };
}

export async function recordGoogleSyncFailure(orgId: string, error: unknown) {
  const admin = createAdminClient();
  const message =
    error instanceof Error ? error.message.slice(0, 300) : "Google sync failed";
  const now = new Date().toISOString();
  await Promise.all(
    ["gmail", "google-calendar"].map(async (provider) => {
      const { data: current } = await admin
        .from("integration_health")
        .select("errors_count")
        .eq("org_id", orgId)
        .eq("provider", provider)
        .maybeSingle();
      await admin.from("integration_health").upsert(
        {
          org_id: orgId,
          provider,
          status: "error",
          errors_count: (current?.errors_count || 0) + 1,
          last_error: message,
          updated_at: now,
        },
        { onConflict: "org_id,provider" },
      );
      await admin
        .from("integrations")
        .update({ last_error: message, updated_at: now })
        .eq("org_id", orgId)
        .eq("provider", provider);
    }),
  );
}
