import { decryptIntegrationCredentials } from "@/lib/integration-credentials";
import { FACEBOOK_GRAPH_API_VERSION } from "@/lib/facebook-oauth";
import {
  refreshGoogleCredentials,
  type GoogleCredentials,
} from "@/lib/integrations/google-sync";
import { getIntegrationAccount } from "@/lib/integrations/integration-accounts";
import {
  refreshMicrosoftCredentials,
  sendMicrosoftMail,
} from "@/lib/integrations/microsoft-graph";

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
  facebookPageId,
  integrationAccountId,
  subjectMode = "reply",
}: {
  admin: AdminClient;
  orgId: string;
  channel: DeliveryChannel;
  recipient: string;
  content: string;
  subject?: string | null;
  threadId?: string | null;
  facebookPageId?: string | null;
  integrationAccountId?: string | null;
  subjectMode?: "reply" | "forward" | "plain";
}) {
  const provider =
    channel === "email"
      ? "gmail"
      : channel === "facebook"
        ? "facebook"
        : "whatsapp";
  if (channel === "email") {
    let account = null;
    try {
      account = await getIntegrationAccount({
        admin,
        orgId,
        accountId: integrationAccountId,
        resourceType: "mail",
        capability: "send",
      });
    } catch (accountError) {
      // The additive migration can be deployed independently of this code.
      // Fall through to the legacy primary Gmail connection if its table does
      // not exist yet; surface all other account lookup errors.
      if ((accountError as { code?: string })?.code !== "42P01") {
        throw accountError;
      }
    }
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
    const finalSubject = `${subjectPrefix}${safeSubject}`;

    if (account?.provider === "microsoft") {
      const microsoft = await refreshMicrosoftCredentials(admin, account);
      if (!microsoft.access_token) {
        throw new Error("Microsoft 365 access has expired");
      }
      return sendMicrosoftMail({
        accessToken: microsoft.access_token,
        recipient: safeRecipient,
        subject: finalSubject,
        content,
      });
    }

    let encrypted = account?.credentials_encrypted;
    if (!encrypted) {
      const { data: legacy, error } = await admin
        .from("integrations")
        .select("credentials_encrypted")
        .eq("org_id", orgId)
        .eq("provider", "gmail")
        .eq("status", "connected")
        .maybeSingle();
      if (error) throw error;
      encrypted = legacy?.credentials_encrypted;
    }
    if (!encrypted) throw new Error("No connected mail account was found");
    const stored = decryptIntegrationCredentials<GoogleCredentials>(
      encrypted,
    );
    const credentials = await refreshGoogleCredentials(
      admin,
      orgId,
      stored,
      account?.id,
    );
    if (!credentials.access_token) throw new Error("Gmail access has expired");
    const encodedSubject = `=?UTF-8?B?${Buffer.from(finalSubject, "utf8").toString("base64")}?=`;
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

  if (channel === "facebook") {
    const pageId =
      facebookPageId ||
      (typeof settings.facebook_page_id === "string"
        ? settings.facebook_page_id
        : undefined);
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
