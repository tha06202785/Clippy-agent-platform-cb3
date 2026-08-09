type GmailHeader = { name?: string; value?: string };

export type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    mimeType?: string;
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: any[];
  };
};

const LEAD_TERMS = [
  "property", "inspection", "inspect", "open home", "open house", "listing",
  "buy", "buyer", "sell", "vendor", "rent", "rental", "lease", "tenant",
  "apartment", "house", "unit", "townhouse", "land", "auction", "offer",
  "real estate", "domain.com.au", "realestate.com.au", "enquiry", "inquiry",
];

const EXCLUDED_TERMS = [
  "unsubscribe", "newsletter", "receipt", "invoice", "password", "security alert",
  "verification code", "one-time", "order confirmation", "delivery update",
  "statement available", "promotion", "marketing preferences", "social notification",
];

function decodeBase64Url(value = "") {
  if (!value) return "";
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function plainTextFromPart(part: any): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts || []) {
    const text = plainTextFromPart(child);
    if (text) return text;
  }
  if (part.body?.data) {
    return decodeBase64Url(part.body.data).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

export function parseGmailMessage(message: GmailMessage) {
  const headers = message.payload?.headers || [];
  const header = (name: string) => headers.find(h => h.name?.toLowerCase() === name)?.value || "";
  const from = header("from");
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = (emailMatch?.[1] || emailMatch?.[0] || "").toLowerCase().trim();
  return {
    id: message.id,
    threadId: message.threadId,
    subject: header("subject").trim(),
    from,
    email,
    name: from.replace(/<[^>]+>/, "").replace(/^"|"$/g, "").trim() || null,
    body: plainTextFromPart(message.payload).trim(),
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString(),
    labels: message.labelIds || [],
  };
}

export function isLikelyRealEstateLead(email: ReturnType<typeof parseGmailMessage>) {
  const haystack = `${email.subject} ${email.body}`.toLowerCase();
  if (!email.email || !email.body) return false;
  if (email.labels.some(label => ["SPAM", "TRASH", "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL"].includes(label))) return false;
  if (/^(no-?reply|notifications?|mailer-daemon)@/i.test(email.email)) return false;
  if (EXCLUDED_TERMS.some(term => haystack.includes(term))) return false;
  return LEAD_TERMS.some(term => haystack.includes(term));
}

async function refreshAccessToken(credentials: any) {
  if (credentials.expires_at && Date.now() < credentials.expires_at - 60_000) return credentials;
  if (!credentials.refresh_token) return credentials;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: credentials.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Gmail token refresh failed (${response.status})`);
  const fresh = await response.json();
  return { ...credentials, ...fresh, expires_at: Date.now() + (fresh.expires_in || 3600) * 1000 };
}

export async function syncGmailIntegration(supabase: any, integration: any) {
  let credentials = JSON.parse(integration.credentials_encrypted || "{}");
  credentials = await refreshAccessToken(credentials);
  const accessToken = credentials.access_token;
  if (!accessToken) throw new Error("Gmail access token missing");

  const lastSync = integration.settings_json?.gmail_last_sync_at;
  const after = lastSync ? Math.floor(new Date(lastSync).getTime() / 1000) : Math.floor(Date.now() / 1000) - 7 * 86400;
  const query = encodeURIComponent(`in:inbox after:${after} -category:promotions -category:social -in:spam -in:trash`);
  const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listResponse.ok) throw new Error(`Gmail list failed (${listResponse.status})`);
  const list = await listResponse.json();
  let imported = 0;
  let ignored = 0;

  for (const item of list.messages || []) {
    const existing = await supabase.from("conversation_messages").select("id").eq("external_message_id", item.id).maybeSingle();
    if (existing.data) continue;
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) continue;
    const email = parseGmailMessage(await response.json());
    if (!isLikelyRealEstateLead(email)) { ignored++; continue; }

    let { data: lead } = await supabase.from("leads").select("id").eq("org_id", integration.org_id).eq("email", email.email).maybeSingle();
    if (!lead) {
      const created = await supabase.from("leads").insert({
        org_id: integration.org_id, full_name: email.name, email: email.email,
        source: "gmail", stage: "new", last_contact_at: email.receivedAt,
      }).select("id").single();
      lead = created.data;
      if (lead) await supabase.from("lead_identities").insert({ org_id: integration.org_id, lead_id: lead.id, channel: "email", email_normalized: email.email });
    }
    if (!lead) continue;

    let { data: conversation } = await supabase.from("conversations").select("id").eq("org_id", integration.org_id).eq("channel", "email").eq("external_conversation_id", email.threadId).maybeSingle();
    if (!conversation) {
      const created = await supabase.from("conversations").insert({
        org_id: integration.org_id, lead_id: lead.id, channel: "email",
        external_conversation_id: email.threadId, status: "active", lead_stage: "new",
        automation_mode: "paused", last_message_at: email.receivedAt,
      }).select("id").single();
      conversation = created.data;
    }
    if (!conversation) continue;
    await supabase.from("conversation_messages").insert({
      conversation_id: conversation.id, role: "lead", content: email.body,
      channel: "email", external_message_id: email.id,
      metadata: { subject: email.subject, from: email.from, gmail_thread_id: email.threadId },
      created_at: email.receivedAt,
    });
    await supabase.from("conversations").update({ last_message_at: email.receivedAt, updated_at: new Date().toISOString() }).eq("id", conversation.id);
    imported++;
  }

  const now = new Date().toISOString();
  await supabase.from("integrations").update({
    credentials_encrypted: JSON.stringify(credentials),
    settings_json: { ...(integration.settings_json || {}), gmail_last_sync_at: now },
    updated_at: now,
  }).eq("id", integration.id);
  return { imported, ignored };
}
