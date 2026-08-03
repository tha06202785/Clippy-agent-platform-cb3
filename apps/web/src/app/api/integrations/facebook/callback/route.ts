import { NextRequest, NextResponse } from "next/server";
import {
  buildFacebookPageAccountsUrl,
  buildFacebookTokenUrl,
  getFacebookOAuthRedirectUri,
  getSafeFacebookErrorDetails,
} from "@/lib/facebook-oauth";
import {
  FACEBOOK_OAUTH_STATE_COOKIE,
  matchesOAuthState,
} from "@/lib/oauth-state";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

function redirectAndClearState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/facebook",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const providerError = searchParams.get("error");
  const expectedState = req.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;

  if (providerError) {
    return redirectAndClearState(
      new URL(
        "/integrations?error=" + encodeURIComponent(providerError),
        origin,
      ),
    );
  }

  if (!code) {
    return redirectAndClearState(
      new URL("/integrations?error=no_code", origin),
    );
  }

  if (!matchesOAuthState(expectedState, returnedState)) {
    return redirectAndClearState(
      new URL("/integrations?error=invalid_state", origin),
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return redirectAndClearState(
        new URL("/sign-in?next=/integrations", origin),
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership?.org_id) {
      return redirectAndClearState(
        new URL("/integrations?error=no_org", origin),
      );
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      return redirectAndClearState(
        new URL("/integrations?error=not_configured", origin),
      );
    }

    const redirectUri = getFacebookOAuthRedirectUri();
    const tokenResponse = await fetch(
      buildFacebookTokenUrl({
        appId,
        appSecret,
        code,
        redirectUri,
      }),
    );

    if (!tokenResponse.ok) {
      const failurePayload = await tokenResponse.json().catch(() => null);
      console.error("Facebook token exchange failed", {
        status: tokenResponse.status,
        ...getSafeFacebookErrorDetails(failurePayload),
      });
      return redirectAndClearState(
        new URL("/integrations?error=token_exchange_failed", origin),
      );
    }

    const tokens = (await tokenResponse.json()) as FacebookTokenResponse;
    if (!tokens.access_token) {
      console.error("Facebook token exchange returned no access token");
      return redirectAndClearState(
        new URL("/integrations?error=token_exchange_failed", origin),
      );
    }

    let pageId = "";
    try {
      const pageResponse = await fetch(
        buildFacebookPageAccountsUrl(tokens.access_token),
      );
      if (pageResponse.ok) {
        const pages = await pageResponse.json();
        pageId = pages.data?.[0]?.id || "";
      } else {
        const failurePayload = await pageResponse.json().catch(() => null);
        console.warn("Facebook Page discovery failed", {
          status: pageResponse.status,
          ...getSafeFacebookErrorDetails(failurePayload),
        });
      }
    } catch {
      // Page discovery is optional; credential persistence remains valid.
    }

    const admin = createAdminClient();
    const { error: saveError } = await admin.from("integrations").upsert(
      {
        org_id: membership.org_id,
        provider: "facebook",
        status: "connected",
        credentials_encrypted: encryptIntegrationCredentials(tokens),
        settings_json: pageId ? { facebook_page_id: pageId } : {},
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,provider" },
    );

    if (saveError) {
      console.error("Failed to save Facebook integration", saveError.code);
      return redirectAndClearState(
        new URL("/integrations?error=save_failed", origin),
      );
    }

    return redirectAndClearState(
      new URL("/integrations?connected=facebook", origin),
    );
  } catch (error) {
    console.error("Facebook OAuth callback failed", error);
    return redirectAndClearState(
      new URL("/integrations?error=callback_failed", origin),
    );
  }
}
