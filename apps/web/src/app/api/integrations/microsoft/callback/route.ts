import { NextRequest, NextResponse } from "next/server";
import { recordClippyActivity } from "@/lib/activity-log";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import {
  normaliseOAuthScopes,
  upsertIntegrationAccount,
} from "@/lib/integrations/integration-accounts";
import {
  getMicrosoftOAuthConfig,
  getMicrosoftOAuthRedirectUri,
  getMicrosoftTokenUrl,
  MicrosoftOAuthConfigurationError,
} from "@/lib/microsoft-oauth-config";
import {
  matchesOAuthState,
  MICROSOFT_OAUTH_STATE_COOKIE,
} from "@/lib/oauth-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MicrosoftTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type MicrosoftProfile = {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

function redirectAndClearState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(MICROSOFT_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/microsoft",
    maxAge: 0,
  });
  return response;
}
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const providerError = searchParams.get("error");
  const expectedState = req.cookies.get(MICROSOFT_OAUTH_STATE_COOKIE)?.value;

  if (providerError) {
    return redirectAndClearState(
      new URL(
        `/integrations?error=${encodeURIComponent(providerError)}`,
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
    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return redirectAndClearState(
        new URL("/integrations?error=no_org", origin),
      );
    }

    const { clientId, clientSecret, tenantId } = getMicrosoftOAuthConfig();
    const tokenResponse = await fetch(getMicrosoftTokenUrl(tenantId), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getMicrosoftOAuthRedirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) {
      console.error("Microsoft token exchange failed", tokenResponse.status);
      return redirectAndClearState(
        new URL("/integrations?error=microsoft_token_failed", origin),
      );
    }
    const tokens = (await tokenResponse.json()) as MicrosoftTokenResponse;
    if (!tokens.access_token) {
      return redirectAndClearState(
        new URL("/integrations?error=microsoft_token_failed", origin),
      );
    }

    const profileResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (!profileResponse.ok) {
      console.error("Microsoft profile lookup failed", profileResponse.status);
      return redirectAndClearState(
        new URL("/integrations?error=microsoft_profile_failed", origin),
      );
    }
    const profile = (await profileResponse.json()) as MicrosoftProfile;
    if (!profile.id) {
      return redirectAndClearState(
        new URL("/integrations?error=microsoft_profile_failed", origin),
      );
    }

    const expiresAt = new Date(
      Date.now() + (tokens.expires_in || 3600) * 1000,
    ).toISOString();
    const credentialsEncrypted = encryptIntegrationCredentials({
      ...tokens,
      expires_at: expiresAt,
    });
    const email = profile.mail || profile.userPrincipalName || null;
    const admin = createAdminClient();
    const account = await upsertIntegrationAccount({
      admin,
      orgId: membership.org_id,
      userId: user.id,
      provider: "microsoft",
      externalAccountId: profile.id,
      email,
      displayName: profile.displayName || null,
      credentialsEncrypted,
      scopes: normaliseOAuthScopes(tokens.scope),
      settings: { tenant_id: tenantId },
      resources: [
        { type: "mail", displayName: "Outlook Mail" },
        { type: "calendar", displayName: "Outlook Calendar" },
      ],
    });

    if (account.is_primary) {
      const now = new Date().toISOString();
      const legacySettings = {
        integration_account_id: account.id,
        external_account_id: profile.id,
        email,
        display_name: profile.displayName || null,
        scope: tokens.scope || null,
      };
      const { error: legacyError } = await admin.from("integrations").upsert(
        [
          {
            org_id: membership.org_id,
            provider: "outlook-mail",
            status: "connected",
            credentials_encrypted: credentialsEncrypted,
            settings_json: legacySettings,
            connected_at: now,
            updated_at: now,
            last_error: null,
          },
          {
            org_id: membership.org_id,
            provider: "microsoft-calendar",
            status: "connected",
            credentials_encrypted: credentialsEncrypted,
            settings_json: legacySettings,
            connected_at: now,
            updated_at: now,
            last_error: null,
          },
        ],
        { onConflict: "org_id,provider" },
      );
      if (legacyError) throw legacyError;
    }

    await recordClippyActivity(admin, {
      orgId: membership.org_id,
      userId: user.id,
      action: "microsoft_account_connected",
      category: "integration",
      title: "Microsoft 365 account connected",
      description: "Outlook Mail and Calendar access was connected securely.",
      impactSummary: "Another mailbox and calendar can now be synced",
      metadata: {
        integration_account_id: account.id,
        provider: "microsoft",
        email,
      },
      completedAt: new Date().toISOString(),
    });

    return redirectAndClearState(
      new URL("/integrations?connected=microsoft", origin),
    );
  } catch (error) {
    if (error instanceof MicrosoftOAuthConfigurationError) {
      return redirectAndClearState(
        new URL("/integrations?error=microsoft_not_configured", origin),
      );
    }
    console.error("Microsoft OAuth callback failed", error);
    return redirectAndClearState(
      new URL("/integrations?error=microsoft_failed", origin),
    );
  }
}
