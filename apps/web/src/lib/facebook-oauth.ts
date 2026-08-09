import { getAppOrigin } from "@/lib/app-origin";

export const FACEBOOK_GRAPH_API_VERSION = "v25.0";
const FACEBOOK_CALLBACK_PATH = "/api/integrations/facebook/callback";

export const FACEBOOK_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_manage_messages",
] as const;

export type MetaPageConnection = {
  id: string;
  name?: string;
  accessToken?: string;
  instagram?: {
    id: string;
    username?: string;
    name?: string;
    profilePictureUrl?: string;
  };
};

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
  url.searchParams.set("scope", FACEBOOK_OAUTH_SCOPES.join(","));
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
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
  );
  url.searchParams.set("access_token", accessToken);
  return url;
}

export function buildMetaObjectUrl(
  objectId: string,
  fields: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${encodeURIComponent(objectId)}`,
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);
  return url;
}

export function parseMetaPageConnections(
  payload: unknown,
): MetaPageConnection[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }

  const data = payload.data;
  if (!Array.isArray(data)) return [];

  return data.flatMap((item): MetaPageConnection[] => {
    if (!item || typeof item !== "object") return [];
    const id = "id" in item && typeof item.id === "string" ? item.id : "";
    if (!id) return [];

    const instagramValue =
      "instagram_business_account" in item
        ? item.instagram_business_account
        : undefined;
    const instagram =
      instagramValue && typeof instagramValue === "object"
        ? {
            id:
              "id" in instagramValue && typeof instagramValue.id === "string"
                ? instagramValue.id
                : "",
            username:
              "username" in instagramValue &&
              typeof instagramValue.username === "string"
                ? instagramValue.username
                : undefined,
            name:
              "name" in instagramValue &&
              typeof instagramValue.name === "string"
                ? instagramValue.name
                : undefined,
            profilePictureUrl:
              "profile_picture_url" in instagramValue &&
              typeof instagramValue.profile_picture_url === "string"
                ? instagramValue.profile_picture_url
                : undefined,
          }
        : undefined;

    return [
      {
        id,
        name:
          "name" in item && typeof item.name === "string"
            ? item.name
            : undefined,
        accessToken:
          "access_token" in item && typeof item.access_token === "string"
            ? item.access_token
            : undefined,
        instagram: instagram?.id ? instagram : undefined,
      },
    ];
  });
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
