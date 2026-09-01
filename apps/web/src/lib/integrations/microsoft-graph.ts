import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "@/lib/integration-credentials";
import {
  getMicrosoftOAuthConfig,
  getMicrosoftTokenUrl,
} from "@/lib/microsoft-oauth-config";
import type {
  AdminClient,
  StoredIntegrationAccount,
} from "@/lib/integrations/integration-accounts";

export type MicrosoftCredentials = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: string;
  scope?: string;
  token_type?: string;
};

export async function refreshMicrosoftCredentials(
  admin: AdminClient,
  account: StoredIntegrationAccount,
): Promise<MicrosoftCredentials> {
  const stored = decryptIntegrationCredentials<MicrosoftCredentials>(
    account.credentials_encrypted,
  );
  const expiresAt = stored.expires_at
    ? new Date(stored.expires_at).getTime()
    : 0;
  if (stored.access_token && expiresAt > Date.now() + 60_000) return stored;
  if (!stored.refresh_token) {
    throw new Error("Microsoft access has expired; reconnect Microsoft 365");
  }

  const { clientId, clientSecret, tenantId } = getMicrosoftOAuthConfig();
  const response = await fetch(getMicrosoftTokenUrl(tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: stored.refresh_token,
      grant_type: "refresh_token",
      scope: stored.scope || "offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite",
    }),
  });
  if (!response.ok) {
    throw new Error(`Microsoft token refresh failed (${response.status})`);
  }
  const refreshed = (await response.json()) as MicrosoftCredentials;
  const merged: MicrosoftCredentials = {
    ...stored,
    ...refreshed,
    refresh_token: refreshed.refresh_token || stored.refresh_token,
    expires_at: new Date(
      Date.now() + (refreshed.expires_in || 3600) * 1000,
    ).toISOString(),
  };
  const encrypted = encryptIntegrationCredentials(merged);
  const now = new Date().toISOString();
  const { error } = await admin
    .from("integration_accounts")
    .update({
      credentials_encrypted: encrypted,
      updated_at: now,
      last_error: null,
    })
    .eq("id", account.id)
    .eq("org_id", account.org_id);
  if (error) throw new Error(`Unable to store Microsoft token: ${error.code}`);

  if (account.is_primary) {
    await admin
      .from("integrations")
      .update({ credentials_encrypted: encrypted, updated_at: now, last_error: null })
      .eq("org_id", account.org_id)
      .in("provider", ["outlook-mail", "microsoft-calendar"]);
  }
  return merged;
}

export async function sendMicrosoftMail({
  accessToken,
  recipient,
  subject,
  content,
}: {
  accessToken: string;
  recipient: string;
  subject: string;
  content: string;
}) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      body: { contentType: "Text", content },
      toRecipients: [{ emailAddress: { address: recipient } }],
    }),
  });
  const draft = (await response.json().catch(() => ({}))) as {
    id?: string;
    conversationId?: string;
    error?: { message?: string };
  };
  if (!response.ok || !draft.id) {
    throw new Error(draft.error?.message || "Outlook draft creation failed");
  }
  const sendResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(draft.id)}/send`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!sendResponse.ok) throw new Error("Outlook delivery failed");
  return { externalId: draft.id, threadId: draft.conversationId || "" };
}
