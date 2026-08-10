import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  getGoogleOAuthRedirectUri,
  GoogleOAuthConfigurationError,
} from "@/lib/google-oauth-config";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  matchesOAuthState,
} from "@/lib/oauth-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectAndClearState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/google",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const providerError = searchParams.get("error");
  const expectedState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

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

    const { clientId, clientSecret } = getGoogleOAuthConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleOAuthRedirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) {
      const provider = (await tokenResponse.json().catch(() => ({}))) as {
        error?: string;
      };
      const errorCode =
        provider.error === "invalid_client"
          ? "google_invalid_client"
          : provider.error === "redirect_uri_mismatch"
            ? "google_redirect_mismatch"
            : provider.error === "invalid_grant"
              ? "google_invalid_grant"
              : "token_exchange_failed";
      console.error(
        "Google token exchange failed",
        tokenResponse.status,
        provider.error || "unknown_error",
      );
      return redirectAndClearState(
        new URL(`/integrations?error=${errorCode}`, origin),
      );
    }

    const tokens = await tokenResponse.json();
    const admin = createAdminClient();
    const credentialsEncrypted = encryptIntegrationCredentials(tokens);
    const connection = {
      org_id: membership.org_id,
      status: "connected",
      credentials_encrypted: credentialsEncrypted,
      settings_json: {
        scope: tokens.scope || null,
        token_type: tokens.token_type || null,
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
    };
    const { error: saveError } = await admin.from("integrations").upsert(
      [
        {
          ...connection,
          provider: "gmail",
        },
        {
          ...connection,
          provider: "google-calendar",
        },
      ],
      { onConflict: "org_id,provider" },
    );
    if (saveError) {
      console.error("Failed to save Google integration", saveError.code);
      return redirectAndClearState(
        new URL("/integrations?error=save_failed", origin),
      );
    }

    const { error: healthResetError } = await admin
      .from("integration_health")
      .update({
        status: "healthy",
        last_error: null,
        errors_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", membership.org_id)
      .in("provider", ["gmail", "google-calendar"]);
    if (healthResetError) {
      console.error(
        "Failed to clear stale Google integration health",
        healthResetError.code,
      );
    }

    return redirectAndClearState(
      new URL("/integrations?connected=google", origin),
    );
  } catch (error) {
    if (error instanceof GoogleOAuthConfigurationError) {
      console.error("Google OAuth configuration is invalid", error.message);
      return redirectAndClearState(
        new URL("/integrations?error=not_configured", origin),
      );
    }
    console.error("Google OAuth callback failed", error);
    return redirectAndClearState(
      new URL("/integrations?error=callback_failed", origin),
    );
  }
}
