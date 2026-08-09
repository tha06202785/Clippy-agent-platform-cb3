import { describe, expect, it } from "vitest";
import { FACEBOOK_GRAPH_API_VERSION } from "@/lib/facebook-oauth";
import {
  WHATSAPP_OAUTH_SCOPES,
  buildWhatsAppAuthorizationUrl,
  buildWhatsAppBusinessesUrl,
  buildWhatsAppPhoneNumbersUrl,
  buildWhatsAppTokenUrl,
  getWhatsAppOAuthRedirectUri,
} from "@/lib/whatsapp-oauth";

describe("WhatsApp OAuth URLs", () => {
  it("uses the current shared Meta API version and exact redirect URI", () => {
    const redirectUri = getWhatsAppOAuthRedirectUri(" https://useclippy.com/ ");
    const authorizationUrl = buildWhatsAppAuthorizationUrl({
      appId: "app-id",
      state: "known-state",
      redirectUri,
      configId: "configuration-id",
    });
    const tokenUrl = buildWhatsAppTokenUrl({
      appId: "app-id",
      appSecret: "app-secret",
      code: "authorization-code",
      redirectUri,
    });

    expect(redirectUri).toBe(
      "https://useclippy.com/api/integrations/whatsapp/callback",
    );
    expect(authorizationUrl.pathname).toBe(
      `/${FACEBOOK_GRAPH_API_VERSION}/dialog/oauth`,
    );
    expect(tokenUrl.pathname).toBe(
      `/${FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`,
    );
    expect(authorizationUrl.searchParams.get("scope")?.split(",")).toEqual(
      WHATSAPP_OAUTH_SCOPES,
    );
    expect(authorizationUrl.searchParams.get("config_id")).toBe(
      "configuration-id",
    );
  });

  it("builds account and phone discovery requests", () => {
    const businessesUrl = buildWhatsAppBusinessesUrl("secret-token");
    const phoneNumbersUrl = buildWhatsAppPhoneNumbersUrl(
      "waba/with unsafe chars",
      "secret-token",
    );

    expect(businessesUrl.pathname).toBe(
      `/${FACEBOOK_GRAPH_API_VERSION}/me/businesses`,
    );
    expect(businessesUrl.searchParams.get("fields")).toContain(
      "owned_whatsapp_business_accounts",
    );
    expect(phoneNumbersUrl.pathname).toBe(
      `/${FACEBOOK_GRAPH_API_VERSION}/waba%2Fwith%20unsafe%20chars/phone_numbers`,
    );
  });
});
