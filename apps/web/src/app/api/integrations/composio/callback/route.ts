import { NextRequest, NextResponse } from "next/server";
import {
  canManageComposioToolkit,
  getComposioConnectedAccount,
  getComposioToolkitDisplayName,
  getComposioToolkitProvider,
  getComposioUserId,
  verifyComposioConnectedAccount,
  type ClippyComposioToolkit,
} from "@/lib/composio";
import { getAppOrigin } from "@/lib/app-origin";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import {
  COMPOSIO_OAUTH_STATE_COOKIE,
  matchesOAuthState,
} from "@/lib/oauth-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectAndClearState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(COMPOSIO_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/composio",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const appOrigin = getAppOrigin();
  const status = url.searchParams.get("status");
  const accountId = url.searchParams.get("connected_account_id");
  const returnedState = url.searchParams.get("state");
  const toolkitValue = url.searchParams.get("toolkit")?.toLowerCase();
  const toolkit = toolkitValue as ClippyComposioToolkit;
  const expectedState = req.cookies.get(COMPOSIO_OAUTH_STATE_COOKIE)?.value;

  if (toolkit !== "whatsapp" && toolkit !== "follow_up_boss") {
    return redirectAndClearState(
      new URL("/integrations?error=composio_invalid_toolkit", appOrigin),
    );
  }
  if (!matchesOAuthState(expectedState, returnedState)) {
    return redirectAndClearState(
      new URL("/integrations?error=invalid_state", appOrigin),
    );
  }
  if (status !== "success" || !accountId) {
    return redirectAndClearState(
      new URL("/integrations?error=composio_access_denied", appOrigin),
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return redirectAndClearState(
        new URL("/sign-in?next=/integrations", appOrigin),
      );
    }
    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id,role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return redirectAndClearState(
        new URL("/integrations?error=no_org", appOrigin),
      );
    }
    if (!canManageComposioToolkit(toolkit, membership.role)) {
      return redirectAndClearState(
        new URL("/integrations?error=crm_admin_required", appOrigin),
      );
    }

    const composioUserId = getComposioUserId(membership.org_id, user.id);
    const account = await getComposioConnectedAccount(accountId);
    if (
      !verifyComposioConnectedAccount({
        account,
        toolkit,
        expectedUserId: composioUserId,
      })
    ) {
      console.warn("Rejected mismatched Composio callback", {
        toolkit,
        accountStatus: account.status,
      });
      return redirectAndClearState(
        new URL("/integrations?error=composio_account_mismatch", appOrigin),
      );
    }

    const provider = getComposioToolkitProvider(toolkit);
    const displayName = getComposioToolkitDisplayName(toolkit);
    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { error: saveError } = await admin.from("integrations").upsert(
      {
        org_id: membership.org_id,
        provider,
        status: "connected",
        credentials_encrypted: encryptIntegrationCredentials({
          connection_provider: "composio",
          connected_account_id: account.id,
        }),
        settings_json: {
          connection_mode: "composio",
          connected_account_id: account.id,
          toolkit: account.toolkit?.slug || toolkit.toUpperCase(),
          auth_scheme: account.auth_config?.auth_scheme || null,
          managed_auth: account.auth_config?.is_composio_managed ?? null,
          access_mode:
            toolkit === "follow_up_boss" ? "connection_only" : "delivery_proof",
          import_enabled: false,
          write_enabled: false,
        },
        connected_at: now,
        updated_at: now,
      },
      { onConflict: "org_id,provider" },
    );
    if (saveError) throw saveError;

    await admin.from("integration_health").upsert({
      org_id: membership.org_id,
      provider,
      status: "healthy",
      last_error: null,
      last_sync_at: now,
      items_indexed: 0,
      activity_summary: {
        connectionMode: "composio",
        connectedAt: now,
        accountStatus: account.status,
      },
    });

    await admin.from("clippy_activity_log").insert({
      org_id: membership.org_id,
      user_id: user.id,
      action: "integration_connected",
      category: "integration",
      title: `${displayName} connected`,
      description: `${displayName} was connected securely through Composio`,
      metadata: {
        provider,
        connectionMode: "composio",
        connectedAccountId: account.id,
      },
      impact_summary:
        toolkit === "follow_up_boss"
          ? "CRM connection is ready for a read-only mapping proof"
          : "WhatsApp connection is ready for a delivery proof",
      completed_at: now,
    });

    return redirectAndClearState(
      new URL(`/integrations?success=${provider}`, appOrigin),
    );
  } catch (error) {
    console.error("Composio callback failed", {
      toolkit,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return redirectAndClearState(
      new URL("/integrations?error=composio_failed", appOrigin),
    );
  }
}
