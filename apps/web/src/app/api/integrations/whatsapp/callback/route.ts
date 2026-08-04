import { NextRequest, NextResponse } from "next/server";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import {
  matchesOAuthState,
  WHATSAPP_OAUTH_STATE_COOKIE,
} from "@/lib/oauth-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectAndClearState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(WHATSAPP_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/whatsapp",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const providerError = searchParams.get("error");
  const expectedState = req.cookies.get(WHATSAPP_OAUTH_STATE_COOKIE)?.value;

  if (providerError) {
    return redirectAndClearState(
      new URL("/integrations?error=" + encodeURIComponent(providerError), origin),
    );
  }
  if (!code) {
    return redirectAndClearState(new URL("/integrations?error=no_code", origin));
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

    const clientId =
      process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
    const clientSecret =
      process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    if (!clientId || !clientSecret) {
      return redirectAndClearState(
        new URL("/integrations?error=not_configured", origin),
      );
    }

    const configuredOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "https://useclippy.com";
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token?" +
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri:
            configuredOrigin + "/api/integrations/whatsapp/callback",
          code,
        }),
    );
    if (!tokenResponse.ok) {
      console.error("WhatsApp token exchange failed", tokenResponse.status);
      return redirectAndClearState(
        new URL("/integrations?error=token_exchange_failed", origin),
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return redirectAndClearState(
        new URL("/integrations?error=token_exchange_failed", origin),
      );
    }

    const longLivedResponse = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token?" +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: accessToken,
        }),
    );
    const longLivedData = longLivedResponse.ok
      ? await longLivedResponse.json()
      : {};
    const longLivedToken = longLivedData.access_token || accessToken;
    const expiresAt = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let whatsappAccounts: unknown = { data: [] };
    const accountResponse = await fetch(
      "https://graph.facebook.com/v19.0/me?" +
        new URLSearchParams({
          fields:
            "whatsapp_business_accounts{id,name,phone_numbers{id,phone_number,verified_name,status}}",
          access_token: longLivedToken,
        }),
    );
    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      whatsappAccounts =
        accountData.whatsapp_business_accounts || { data: [] };
    }

    const admin = createAdminClient();
    const { error: saveError } = await admin.from("integrations").upsert(
      {
        org_id: membership.org_id,
        provider: "whatsapp",
        status: "connected",
        credentials_encrypted: encryptIntegrationCredentials({
          access_token: longLivedToken,
          expires_at: expiresAt,
        }),
        settings_json: { whatsapp_accounts: whatsappAccounts },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,provider" },
    );
    if (saveError) {
      console.error("Failed to save WhatsApp integration", saveError.code);
      return redirectAndClearState(
        new URL("/integrations?error=save_failed", origin),
      );
    }

    const accounts =
      typeof whatsappAccounts === "object" &&
      whatsappAccounts !== null &&
      "data" in whatsappAccounts &&
      Array.isArray((whatsappAccounts as { data?: unknown[] }).data)
        ? (whatsappAccounts as { data: unknown[] }).data.length
        : 0;

    await admin.from("integration_health").upsert({
      org_id: membership.org_id,
      provider: "whatsapp",
      status: "healthy",
      last_sync_at: new Date().toISOString(),
      items_indexed: 0,
      activity_summary: {
        connectedAt: new Date().toISOString(),
        accountsConnected: accounts,
      },
    });

    await admin.from("clippy_activity_log").insert({
      org_id: membership.org_id,
      user_id: user.id,
      action: "integration_connected",
      category: "integration",
      title: "WhatsApp Cloud API connected",
      description: "WhatsApp Business API integration completed",
      metadata: { provider: "whatsapp", accounts },
      impact_summary: "Can now send WhatsApp messages to leads",
      completed_at: new Date().toISOString(),
    });

    return redirectAndClearState(
      new URL("/integrations?success=whatsapp", origin),
    );
  } catch (error) {
    console.error("WhatsApp OAuth callback failed", error);
    return redirectAndClearState(
      new URL("/integrations?error=whatsapp_failed", origin),
    );
  }
}
