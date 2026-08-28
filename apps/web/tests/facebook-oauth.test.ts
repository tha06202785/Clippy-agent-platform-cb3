import { describe, expect, it } from "vitest";
import {
  FACEBOOK_GRAPH_API_VERSION,
  FACEBOOK_OAUTH_SCOPES,
  buildFacebookAuthorizationUrl,
  buildFacebookPageAccountsUrl,
  buildFacebookTokenUrl,
  getFacebookOAuthRedirectUri,
  getSafeFacebookErrorDetails,
  parseMetaPageConnections,
} from "@/lib/facebook-oauth";

describe("Facebook OAuth URLs", () => {
  it("uses a supported Graph API version", () => {
    expect(FACEBOOK_GRAPH_API_VERSION).toBe("v25.0");
  });

  it("uses the exact same normalised redirect URI for both OAuth steps", () => {
    const redirectUri = getFacebookOAuthRedirectUri(
      "  https://useclippy.com/\n",
    );
    const authorizationUrl = buildFacebookAuthorizationUrl({
      appId: "app-id",
      state: "known-state",
      redirectUri,
    });
    const tokenUrl = buildFacebookTokenUrl({
      appId: "app-id",
      appSecret: "app-secret",
      code: "authorization-code",
      redirectUri,
    });

    expect(redirectUri).toBe(
      "https://useclippy.com/api/integrations/facebook/callback",
    );
    expect(authorizationUrl.pathname).toBe("/v25.0/dialog/oauth");
    expect(tokenUrl.pathname).toBe("/v25.0/oauth/access_token");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(tokenUrl.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(authorizationUrl.searchParams.get("scope")?.split(",")).toEqual(
      FACEBOOK_OAUTH_SCOPES,
    );
    expect(authorizationUrl.searchParams.get("scope")).not.toContain(
      "instagram_",
    );
  });

  it("requests linked Instagram account data without exposing page tokens", () => {
    const url = buildFacebookPageAccountsUrl("secret-user-token");
    expect(url.pathname).toBe("/v25.0/me/accounts");
    expect(url.searchParams.get("fields")).toContain(
      "instagram_business_account",
    );

    expect(
      parseMetaPageConnections({
        data: [
          {
            id: "page-1",
            name: "Clippy Realty",
            access_token: "secret-page-token",
            instagram_business_account: {
              id: "ig-1",
              username: "clippyrealty",
            },
          },
        ],
      }),
    ).toEqual([
      {
        id: "page-1",
        name: "Clippy Realty",
        accessToken: "secret-page-token",
        instagram: {
          id: "ig-1",
          username: "clippyrealty",
          name: undefined,
          profilePictureUrl: undefined,
        },
      },
    ]);
  });

  it("extracts only safe provider error metadata", () => {
    expect(
      getSafeFacebookErrorDetails({
        error: {
          message: "contains provider detail",
          code: 100,
          error_subcode: 36008,
          type: "OAuthException",
          access_token: "must-not-be-logged",
        },
      }),
    ).toEqual({
      code: 100,
      subcode: 36008,
      type: "OAuthException",
    });
  });
});
