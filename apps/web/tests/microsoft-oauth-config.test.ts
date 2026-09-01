import { describe, expect, it } from "vitest";
import {
  getMicrosoftAuthorizeUrl,
  getMicrosoftOAuthConfig,
  getMicrosoftOAuthRedirectUri,
  MICROSOFT_OAUTH_SCOPES,
} from "@/lib/microsoft-oauth-config";

const clientId = "11111111-2222-4333-8444-555555555555";

describe("Microsoft OAuth configuration", () => {
  it("normalises Entra credentials and defaults to the common tenant", () => {
    expect(
      getMicrosoftOAuthConfig({
        MICROSOFT_CLIENT_ID: ` "${clientId}" `,
        MICROSOFT_CLIENT_SECRET: " 'secret-value' ",
      }),
    ).toEqual({ clientId, clientSecret: "secret-value", tenantId: "common" });
  });

  it("builds a Microsoft 365 consent URL with mail, calendar and offline access", () => {
    const url = getMicrosoftAuthorizeUrl({
      clientId,
      tenantId: "organizations",
      redirectUri: getMicrosoftOAuthRedirectUri({
        NEXT_PUBLIC_APP_URL: "https://useclippy.com/",
      }),
      state: "state-123",
    });
    expect(url.origin).toBe("https://login.microsoftonline.com");
    expect(url.pathname).toContain("/organizations/oauth2/v2.0/authorize");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(
      MICROSOFT_OAUTH_SCOPES,
    );
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://useclippy.com/api/integrations/microsoft/callback",
    );
  });
});
