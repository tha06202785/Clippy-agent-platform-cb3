import { getAppOrigin } from "@/lib/app-origin";

export const FACEBOOK_GRAPH_API_VERSION = "v25.0";
const FACEBOOK_CALLBACK_PATH = "/api/integrations/facebook/callback";

export function getFacebookOAuthRedirectUri(
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
) {
  return `${getAppOrigin(appUrl)}${FACEBOOK_CALLBACK_PATH}`;
}

export function buildFacebookAuthorizationUrl({
  appId,
  state,
  redirectUri,
}: {
  appId: string;
  state: string;
  redirectUri: string;
}) {
  const url = new URL(
    `https://www.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/dialog/oauth`,
  );
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "pages_messaging,pages_manage_metadata");
  url.searchParams.set("state", state);
  return url;
}

export function buildFacebookTokenUrl({
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

export function buildFacebookPageAccountsUrl(accessToken: string) {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/me/accounts`,
  );
  url.searchParams.set("access_token", accessToken);
  return url;
}

export function getSafeFacebookErrorDetails(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return {};
  }

  const error = payload.error;
  if (!error || typeof error !== "object") return {};

  return {
    code:
      "code" in error && typeof error.code === "number"
        ? error.code
        : undefined,
    type:
      "type" in error && typeof error.type === "string"
        ? error.type
        : undefined,
    subcode:
      "error_subcode" in error && typeof error.error_subcode === "number"
        ? error.error_subcode
        : undefined,
  };
}
