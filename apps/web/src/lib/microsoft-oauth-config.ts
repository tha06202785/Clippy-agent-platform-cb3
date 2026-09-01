import { getAppOrigin } from "@/lib/app-origin";

const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TENANT_PATTERN = /^(common|organizations|consumers|[0-9a-f-]{36})$/i;

type MicrosoftOAuthEnvironment = {
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_TENANT_ID?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export const MICROSOFT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Calendars.ReadWrite",
] as const;

export class MicrosoftOAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MicrosoftOAuthConfigurationError";
  }
}
function normalise(value?: string) {
  const trimmed = value?.trim() || "";
  const quoted =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")));
  return (quoted ? trimmed.slice(1, -1) : trimmed).trim();
}

export function getMicrosoftOAuthConfig(env?: MicrosoftOAuthEnvironment) {
  const source = env ?? {
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID,
  };
  const clientId = normalise(source.MICROSOFT_CLIENT_ID);
  const clientSecret = normalise(source.MICROSOFT_CLIENT_SECRET);
  const tenantId = normalise(source.MICROSOFT_TENANT_ID) || "common";

  if (!clientId || !clientSecret) {
    throw new MicrosoftOAuthConfigurationError(
      "MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must both be configured",
    );
  }
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    throw new MicrosoftOAuthConfigurationError(
      "MICROSOFT_CLIENT_ID must be a Microsoft Entra application client ID",
    );
  }
  if (!TENANT_PATTERN.test(tenantId)) {
    throw new MicrosoftOAuthConfigurationError(
      "MICROSOFT_TENANT_ID must be common, organizations, consumers, or a tenant UUID",
    );
  }
  return { clientId, clientSecret, tenantId };
}

export function getMicrosoftOAuthRedirectUri(env?: MicrosoftOAuthEnvironment) {
  return `${getAppOrigin(env?.NEXT_PUBLIC_APP_URL)}/api/integrations/microsoft/callback`;
}

export function getMicrosoftAuthorizeUrl({
  clientId,
  tenantId,
  redirectUri,
  state,
}: {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`,
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url;
}

export function getMicrosoftTokenUrl(tenantId: string) {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
}
