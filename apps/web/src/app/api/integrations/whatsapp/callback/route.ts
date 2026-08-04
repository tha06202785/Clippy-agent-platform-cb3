import { NextRequest, NextResponse } from "next/server";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import {
  matchesOAuthState,
  WHATSAPP_OAUTH_STATE_COOKIE,
} from "@/lib/oauth-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildWhatsAppBusinessesUrl,
  buildWhatsAppPhoneNumbersUrl,
  buildWhatsAppSubscriptionUrl,
  buildWhatsAppTokenUrl,
  getWhatsAppOAuthRedirectUri,
} from "@/lib/whatsapp-oauth";

export const dynamic = "force-dynamic";

type WhatsAppBusinessAccount = {
  id: string;
  name?: string;
  businessId?: string;
  businessName?: string;
};

type WhatsAppPhoneNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  code_verification_status?: string;
  quality_rating?: string;
  name_status?: string;
};

function accountList(value: unknown): Array<{ id?: unknown; name?: unknown }> {
  if (!value || typeof value !== "object" || !("data" in value)) return [];
  return Array.isArray(value.data)
    ? (value.data as Array<{ id?: unknown; name?: unknown }>)
    : [];
}

function parseWhatsAppBusinessAccounts(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }
  const businesses = Array.isArray(payload.data) ? payload.data : [];
  const accounts = new Map<string, WhatsAppBusinessAccount>();

  for (const businessValue of businesses) {
    if (!businessValue || typeof businessValue !== "object") continue;
    const business = businessValue as Record<string, unknown>;
    const businessId =
      typeof business.id === "string" ? business.id : undefined;
    const businessName =
      typeof business.name === "string" ? business.name : undefined;
    for (const key of [
      "owned_whatsapp_business_accounts",
      "client_whatsapp_business_accounts",
    ]) {
      for (const item of accountList(business[key])) {
        if (typeof item.id !== "string" || !item.id) continue;
        accounts.set(item.id, {
          id: item.id,
          name: typeof item.name === "string" ? item.name : undefined,
          businessId,
          businessName,
        });
      }
    }
  }

  return [...accounts.values()];
}

function parseWhatsAppPhoneNumbers(payload: unknown): WhatsAppPhoneNumber[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }
  const data = Array.isArray(payload.data) ? payload.data : [];
  return data.flatMap((item): WhatsAppPhoneNumber[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || !record.id) return [];
    return [
      {
        id: record.id,
        display_phone_number:
          typeof record.display_phone_number === "string"
            ? record.display_phone_number
            : undefined,
        verified_name:
          typeof record.verified_name === "string"
            ? record.verified_name
            : undefined,
        code_verification_status:
          typeof record.code_verification_status === "string"
            ? record.code_verification_status
            : undefined,
        quality_rating:
          typeof record.quality_rating === "string"
            ? record.quality_rating
            : undefined,
        name_status:
          typeof record.name_status === "string"
            ? record.name_status
            : undefined,
      },
    ];
  });
}

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

    const clientId = process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
    const clientSecret =
      process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    if (!clientId || !clientSecret) {
      return redirectAndClearState(
        new URL("/integrations?error=not_configured", origin),
      );
    }

    const redirectUri = getWhatsAppOAuthRedirectUri();
    const tokenResponse = await fetch(
      buildWhatsAppTokenUrl({
        appId: clientId,
        appSecret: clientSecret,
        redirectUri,
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

    const expiresAt =
      typeof tokenData.expires_in === "number"
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : undefined;

    const businessesResponse = await fetch(
      buildWhatsAppBusinessesUrl(accessToken),
    );
    if (!businessesResponse.ok) {
      console.error(
        "WhatsApp business account discovery failed",
        businessesResponse.status,
      );
      return redirectAndClearState(
        new URL(
          "/integrations?error=whatsapp_account_discovery_failed",
          origin,
        ),
      );
    }
    const accounts = parseWhatsAppBusinessAccounts(
      await businessesResponse.json(),
    );

    let selectedAccount: WhatsAppBusinessAccount | undefined;
    let selectedPhone: WhatsAppPhoneNumber | undefined;
    for (const account of accounts) {
      const phoneResponse = await fetch(
        buildWhatsAppPhoneNumbersUrl(account.id, accessToken),
      );
      if (!phoneResponse.ok) continue;
      const phones = parseWhatsAppPhoneNumbers(await phoneResponse.json());
      if (phones[0]) {
        selectedAccount = account;
        selectedPhone = phones[0];
        break;
      }
    }

    if (!selectedAccount || !selectedPhone) {
      return redirectAndClearState(
        new URL("/integrations?error=whatsapp_phone_not_found", origin),
      );
    }

    const subscribedResponse = await fetch(
      buildWhatsAppSubscriptionUrl(selectedAccount.id, accessToken),
      { method: "POST" },
    );
    const webhookSubscribed = subscribedResponse.ok;
    if (!webhookSubscribed) {
      console.warn("WhatsApp webhook subscription failed", {
        status: subscribedResponse.status,
      });
    }

    const connectedAt = new Date().toISOString();
    const phoneStatus =
      selectedPhone.code_verification_status?.toLowerCase() || "unknown";

    const admin = createAdminClient();
    const { error: saveError } = await admin.from("integrations").upsert(
      {
        org_id: membership.org_id,
        provider: "whatsapp",
        status: "connected",
        credentials_encrypted: encryptIntegrationCredentials({
          access_token: accessToken,
          expires_at: expiresAt,
        }),
        settings_json: {
          meta_business_id: selectedAccount.businessId,
          meta_business_name: selectedAccount.businessName,
          whatsapp_business_account_id: selectedAccount.id,
          whatsapp_business_account_name: selectedAccount.name,
          whatsapp_phone_number_id: selectedPhone.id,
          display_phone_number: selectedPhone.display_phone_number,
          verified_name: selectedPhone.verified_name,
          phone_status: phoneStatus,
          quality_rating: selectedPhone.quality_rating,
          name_status: selectedPhone.name_status,
          webhook_subscribed: webhookSubscribed,
        },
        connected_at: connectedAt,
        updated_at: connectedAt,
      },
      { onConflict: "org_id,provider" },
    );
    if (saveError) {
      console.error("Failed to save WhatsApp integration", saveError.code);
      return redirectAndClearState(
        new URL("/integrations?error=save_failed", origin),
      );
    }

    await admin.from("integration_health").upsert({
      org_id: membership.org_id,
      provider: "whatsapp",
      status: webhookSubscribed ? "healthy" : "warning",
      last_sync_at: connectedAt,
      items_indexed: 0,
      activity_summary: {
        connectedAt,
        accountsDiscovered: accounts.length,
        webhookSubscribed,
        phoneStatus,
      },
    });

    await admin.from("clippy_activity_log").insert({
      org_id: membership.org_id,
      user_id: user.id,
      action: "integration_connected",
      category: "integration",
      title: "WhatsApp Cloud API connected",
      description: "WhatsApp Business API integration completed",
      metadata: {
        provider: "whatsapp",
        accountId: selectedAccount.id,
        phoneNumberId: selectedPhone.id,
        webhookSubscribed,
      },
      impact_summary: "Can now send WhatsApp messages to leads",
      completed_at: connectedAt,
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
