import { NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  getGoogleOAuthRedirectUri,
  GoogleOAuthConfigurationError,
} from "@/lib/google-oauth-config";
import { decryptIntegrationCredentials } from "@/lib/integration-credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckStatus = "pass" | "warning" | "error";
type DiagnosticCheck = {
  id: string;
  status: CheckStatus;
  label: string;
  detail: string;
  action?: string;
};

type StoredGoogleCredentials = {
  access_token?: string;
  refresh_token?: string;
};

function response(
  checks: DiagnosticCheck[],
  expectedRedirectUri: string,
  status = 200,
) {
  const overall: CheckStatus = checks.some((check) => check.status === "error")
    ? "error"
    : checks.some((check) => check.status === "warning")
      ? "warning"
      : "pass";

  return NextResponse.json(
    {
      overall,
      expected_redirect_uri: expectedRedirectUri,
      checks,
      checked_at: new Date().toISOString(),
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function apiCheck(
  id: string,
  label: string,
  url: string,
  accessToken: string,
): Promise<DiagnosticCheck> {
  try {
    const result = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (result.ok) {
      return {
        id,
        status: "pass",
        label,
        detail: "Google accepted the stored access token.",
      };
    }
    if (result.status === 401) {
      return {
        id,
        status: "warning",
        label,
        detail: "The stored access token has expired or was revoked.",
        action: "Reconnect Google to issue a fresh token.",
      };
    }
    if (result.status === 403) {
      return {
        id,
        status: "error",
        label,
        detail: "Google denied this API or the required scope.",
        action: `Enable the ${label} in Google Cloud, then reconnect Google.`,
      };
    }
    return {
      id,
      status: "warning",
      label,
      detail: `Google returned HTTP ${result.status}.`,
      action: "Reconnect Google and run the diagnostic again.",
    };
  } catch {
    return {
      id,
      status: "warning",
      label,
      detail: "Clippy could not reach Google for this check.",
      action: "Try the diagnostic again in a moment.",
    };
  }
}

export async function GET() {
  const expectedRedirectUri = getGoogleOAuthRedirectUri();
  const checks: DiagnosticCheck[] = [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership?.org_id) {
    return NextResponse.json(
      { error: "Organisation membership required" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let clientId: string;
  let clientSecret: string;
  try {
    ({ clientId, clientSecret } = getGoogleOAuthConfig());
    checks.push({
      id: "configuration",
      status: "pass",
      label: "Google OAuth environment",
      detail: "A correctly formatted client ID and client secret are configured.",
    });
  } catch (reason) {
    checks.push({
      id: "configuration",
      status: "error",
      label: "Google OAuth environment",
      detail:
        reason instanceof GoogleOAuthConfigurationError
          ? reason.message
          : "Google OAuth is not configured.",
      action:
        "Set matching GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET values for a Google Web application in Vercel production.",
    });
    checks.push({
      id: "redirect_uri",
      status: "warning",
      label: "Authorised redirect URI",
      detail: expectedRedirectUri,
      action:
        "Add this exact URI to the Google Web application's authorised redirect URIs.",
    });
    return response(checks, expectedRedirectUri);
  }

  checks.push({
    id: "redirect_uri",
    status: "warning",
    label: "Authorised redirect URI",
    detail: expectedRedirectUri,
    action:
      "Confirm this exact URI is listed in the Google Web application's authorised redirect URIs.",
  });

  try {
    const probe = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: "clippy-configuration-diagnostic",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: expectedRedirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const provider = (await probe.json().catch(() => ({}))) as {
      error?: string;
    };

    if (provider.error === "invalid_grant") {
      checks.push({
        id: "client_credentials",
        status: "pass",
        label: "OAuth client credentials",
        detail: "Google recognised the configured OAuth client.",
      });
    } else if (provider.error === "invalid_client") {
      checks.push({
        id: "client_credentials",
        status: "error",
        label: "OAuth client credentials",
        detail: "Google rejected the configured OAuth client.",
        action:
          "Replace GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel production with the matching credentials from one Google Web application.",
      });
    } else if (provider.error === "redirect_uri_mismatch") {
      checks.push({
        id: "client_credentials",
        status: "error",
        label: "OAuth redirect URI",
        detail: "Google rejected Clippy's callback URL.",
        action: `Add ${expectedRedirectUri} as an authorised redirect URI in Google Cloud.`,
      });
    } else {
      checks.push({
        id: "client_credentials",
        status: "warning",
        label: "OAuth client credentials",
        detail: provider.error
          ? `Google returned ${provider.error}.`
          : `Google returned HTTP ${probe.status}.`,
        action: "Review the Google OAuth Web application configuration.",
      });
    }
  } catch {
    checks.push({
      id: "client_credentials",
      status: "warning",
      label: "OAuth client credentials",
      detail: "Clippy could not reach Google's OAuth service.",
      action: "Try the diagnostic again in a moment.",
    });
  }

  const admin = createAdminClient();
  const { data: integration, error: integrationError } = await admin
    .from("integrations")
    .select("status, credentials_encrypted")
    .eq("org_id", membership.org_id)
    .eq("provider", "gmail")
    .maybeSingle();

  if (integrationError) {
    checks.push({
      id: "stored_connection",
      status: "warning",
      label: "Stored Google connection",
      detail: "Clippy could not inspect the stored Google connection.",
      action: "Reconnect Google and run the diagnostic again.",
    });
    return response(checks, expectedRedirectUri);
  }

  if (!integration?.credentials_encrypted) {
    checks.push({
      id: "stored_connection",
      status: "warning",
      label: "Stored Google connection",
      detail: "No Google account token is stored for this organisation.",
      action: "Connect Google after the OAuth configuration checks pass.",
    });
    return response(checks, expectedRedirectUri);
  }

  let credentials: StoredGoogleCredentials;
  try {
    credentials = decryptIntegrationCredentials<StoredGoogleCredentials>(
      integration.credentials_encrypted,
    );
  } catch {
    checks.push({
      id: "stored_connection",
      status: "error",
      label: "Stored Google connection",
      detail: "The stored Google credentials cannot be read.",
      action: "Reconnect Google to replace the stored credentials.",
    });
    return response(checks, expectedRedirectUri);
  }

  checks.push({
    id: "refresh_token",
    status: credentials.refresh_token ? "pass" : "warning",
    label: "Offline refresh token",
    detail: credentials.refresh_token
      ? "A refresh token is stored."
      : "Google did not provide an offline refresh token.",
    ...(!credentials.refresh_token
      ? { action: "Reconnect Google and approve consent again." }
      : {}),
  });

  if (!credentials.access_token) {
    checks.push({
      id: "access_token",
      status: "warning",
      label: "Google API access",
      detail: "No access token is stored.",
      action: "Reconnect Google.",
    });
    return response(checks, expectedRedirectUri);
  }

  const [gmail, calendar] = await Promise.all([
    apiCheck(
      "gmail_api",
      "Gmail API",
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      credentials.access_token,
    ),
    apiCheck(
      "calendar_api",
      "Google Calendar API",
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1&singleEvents=true",
      credentials.access_token,
    ),
  ]);
  checks.push(gmail, calendar);

  return response(checks, expectedRedirectUri);
}
