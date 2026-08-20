import { decryptIntegrationCredentials } from "@/lib/integration-credentials";
import { FACEBOOK_GRAPH_API_VERSION } from "@/lib/facebook-oauth";
import {
  refreshGoogleCredentials,
  type GoogleCredentials,
} from "@/lib/integrations/google-sync";

type AdminClient = any;
type DeliveryChannel = "email" | "facebook" | "whatsapp";

type StoredCredentials = {
  access_token?: string;
  pages?: Array<{ id?: string; access_token?: string }>;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function deliverApprovedMessage({
  admin,
  orgId,
  channel,
  recipient,
  content,
  subject,
  threadId,
  subjectMode = "reply",
}: {
  admin: AdminClient;
  orgId: string;
  channel: DeliveryChannel;
  recipient: string;
  content: string;
  subject?: string | null;
  threadId?: string | null;
  subjectMode?: "reply" | "forward" | "plain";
}) {
  const provider =
    channel === "email"
      ? "gmail"
      : channel === "facebook"
        ? "facebook"
        : "whatsapp";
  const { data: integration, error } = await admin
    .from("integrations")
    .select("status,credentials_encrypted,settings_json")
    .eq("org_id", orgId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();
  if (error) throw error;
  if (!integration?.credentials_encrypted) {
    throw new Error(`${provider} is not connected`);
  }

  const credentials = decryptIntegrationCredentials<StoredCredentials>(
    integration.credentials_encrypted,
  );
  const settings = objectValue(integration.settings_json);

  if (channel === "email") {
    const stored = decryptIntegrationCredentials<GoogleCredentials>(
      integration.credentials_encrypted,
    );
    const credentials = await refreshGoogleCredentials(admin, orgId, stored);
    if (!credentials.access_token) throw new Error("Gmail access has expired");
    const safeRecipient = recipient.replace(/[\r\n]/g, "").trim();
    const safeSubject = (subject || "Message from your real estate agent")
      .replace(/[\r\n]/g, " ")
      .replace(/^\s*(?:re|fwd?):\s*/i, "")
      .trim();
    const subjectPrefix =
      subjectMode === "forward"
        ? "Fwd: "
        : subjectMode === "reply"
          ? "Re: "
          : "";
    const encodedSubject = `=?UTF-8?B?${Buffer.from(`${subjectPrefix}${safeSubject}`, "utf8").toString("base64")}?=`;
    const encodedBody = Buffer.from(content, "utf8").toString("base64");
    const mime = [
      `To: ${safeRecipient}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodedBody,
    ].join("\r\n");
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials.access_token}`,
        },
        body: JSON.stringify({
          raw: Buffer.from(mime, "utf8").toString("base64url"),
          ...(threadId ? { threadId } : {}),
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id)
      throw new Error(payload.error?.message || "Gmail delivery failed");
    return {
      externalId: String(payload.id),
      threadId: String(payload.threadId || threadId || ""),
    };
  }

  if (channel === "facebook") {
    const pageId =
      typeof settings.facebook_page_id === "string"
        ? settings.facebook_page_id
        : undefined;
    const page =
      credentials.pages?.find((item) => item.id === pageId) ||
      credentials.pages?.[0];
    const token = page?.access_token || credentials.access_token;
    if (!token) throw new Error("Facebook Page access has expired");

    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/me/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient: { id: recipient },
          message: { text: content },
          messaging_type: "RESPONSE",
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.message_id) {
      throw new Error(payload.error?.message || "Facebook delivery failed");
    }
    return { externalId: String(payload.message_id), threadId: null };
  }

  const phoneNumberId =
    typeof settings.whatsapp_phone_number_id === "string"
      ? settings.whatsapp_phone_number_id
      : "";
  if (!credentials.access_token || !phoneNumberId) {
    throw new Error("WhatsApp Business access is incomplete");
  }
  const response = await fetch(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient.replace(/\D/g, ""),
        type: "text",
        text: { body: content },
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  const externalId = payload.messages?.[0]?.id;
  if (!response.ok || !externalId) {
    throw new Error(payload.error?.message || "WhatsApp delivery failed");
  }
  return { externalId: String(externalId), threadId: null };
}
