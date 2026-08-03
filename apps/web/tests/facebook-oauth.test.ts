import { describe, expect, it } from "vitest";
import {
  FACEBOOK_GRAPH_API_VERSION,
  buildFacebookAuthorizationUrl,
  buildFacebookTokenUrl,
  getFacebookOAuthRedirectUri,
  getSafeFacebookErrorDetails,
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
    expect(authorizationUrl.pathname).toBe(
      "/v25.0/dialog/oauth",
    );
    expect(tokenUrl.pathname).toBe("/v25.0/oauth/access_token");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(tokenUrl.searchParams.get("redirect_uri")).toBe(redirectUri);
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
