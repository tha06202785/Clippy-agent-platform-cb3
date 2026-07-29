import { describe, expect, it } from "vitest";
import {
  getGoogleOAuthConfig,
  getGoogleOAuthRedirectUri,
} from "@/lib/google-oauth-config";

const validClientId = "1234567890-clippywebclient.apps.googleusercontent.com";

describe("Google OAuth configuration", () => {
  it("normalises values copied into Vercel with whitespace or quotes", () => {
    expect(
      getGoogleOAuthConfig({
        GOOGLE_CLIENT_ID: `  "${validClientId}"\n`,
        GOOGLE_CLIENT_SECRET: "  'GOCSPX-valid-secret'  ",
      }),
    ).toEqual({
      clientId: validClientId,
      clientSecret: "GOCSPX-valid-secret",
    });
  });

  it("rejects a client secret pasted into GOOGLE_CLIENT_ID", () => {
    expect(() =>
      getGoogleOAuthConfig({
        GOOGLE_CLIENT_ID: "GOCSPX-not-a-client-id",
        GOOGLE_CLIENT_SECRET: "GOCSPX-valid-secret",
      }),
    ).toThrow("GOOGLE_CLIENT_ID must be a Google Web application client ID");
  });

  it("requires both server-side credentials before redirecting to Google", () => {
    expect(() =>
      getGoogleOAuthConfig({
        GOOGLE_CLIENT_ID: validClientId,
      }),
    ).toThrow(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be configured",
    );
  });

  it("uses one normalised callback URI for authorization and token exchange", () => {
    expect(
      getGoogleOAuthRedirectUri({
        NEXT_PUBLIC_APP_URL: " https://useclippy.com/ ",
      }),
    ).toBe("https://useclippy.com/api/integrations/google/callback");
  });
});
