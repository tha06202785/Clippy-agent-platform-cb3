import { getAppOrigin } from "@/lib/app-origin";
import { FACEBOOK_GRAPH_API_VERSION } from "@/lib/facebook-oauth";

const WHATSAPP_CALLBACK_PATH = "/api/integrations/whatsapp/callback";

export const WHATSAPP_OAUTH_SCOPES = [
  "business_management",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
] as const;

export function getWhatsAppOAuthRedirectUri(
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
) {
  return `${getAppOrigin(appUrl)}${WHATSAPP_CALLBACK_PATH}`;
}

export function buildWhatsAppAuthorizationUrl({
  appId,
  state,
  redirectUri,
  configId,
}: {
  appId: string;
  state: string;
  redirectUri: string;
  configId?: string;
}) {
  const url = new URL(
    `https://www.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/dialog/oauth`,
  );
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", WHATSAPP_OAUTH_SCOPES.join(","));
  url.searchParams.set("state", state);
  if (configId) url.searchParams.set("config_id", configId);
  return url;
}

export function buildWhatsAppTokenUrl({
  appId,
  appSecret,
  code,
  redirectUri,
}: {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri: string;
}) {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`,
  );
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  return url;
}

export function buildWhatsAppBusinessesUrl(accessToken: string) {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/me/businesses`,
  );
  url.searchParams.set(
    "fields",
    "id,name,owned_whatsapp_business_accounts{id,name},client_whatsapp_business_accounts{id,name}",
  );
  url.searchParams.set("access_token", accessToken);
  return url;
}

export function buildWhatsAppPhoneNumbersUrl(
  whatsappBusinessAccountId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${encodeURIComponent(whatsappBusinessAccountId)}/phone_numbers`,
  );
  url.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,code_verification_status,quality_rating,name_status",
  );
  url.searchParams.set("access_token", accessToken);
  return url;
}

export function buildWhatsAppSubscriptionUrl(
  whatsappBusinessAccountId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${encodeURIComponent(whatsappBusinessAccountId)}/subscribed_apps`,
  );
  url.searchParams.set("access_token", accessToken);
  return url;
}
