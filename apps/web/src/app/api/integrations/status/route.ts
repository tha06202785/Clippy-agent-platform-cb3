import { NextRequest, NextResponse } from "next/server";
import { getGooglePermissionSummary } from "@/lib/integration-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  canManageComposioToolkit,
  isComposioToolkitConfigured,
} from "@/lib/composio";

export const dynamic = "force-dynamic";

async function authenticatedOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return membership?.org_id
    ? { orgId: membership.org_id, role: membership.role || "agent" }
    : null;
}

// GET /api/integrations/status - returns status metadata, never OAuth credentials.
export async function GET(_req: NextRequest) {
  try {
    const auth = await authenticatedOrg();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const [
      { data: integrations, error: integrationsError },
      { data: health },
      { data: accounts, error: accountsError },
    ] = await Promise.all([
      admin
        .from("integrations")
        .select(
          "id,provider,status,settings_json,connected_at,created_at,updated_at",
        )
        .eq("org_id", auth.orgId),
      admin
        .from("integration_health")
        .select(
          "provider,status,last_sync_at,items_indexed,activity_summary,last_error",
        )
        .eq("org_id", auth.orgId),
      admin
        .from("integration_accounts")
        .select(
          "id,provider,email,display_name,status,access_scope,is_primary,connected_at,last_sync_at,last_error,integration_resources(id,resource_type,display_name,status,sync_enabled,send_enabled,learning_enabled,last_sync_at,items_indexed,last_error)",
        )
        .eq("org_id", auth.orgId)
        .neq("status", "disconnected")
        .order("created_at", { ascending: true }),
    ]);

    if (integrationsError) {
      console.error(
        "Failed to load integration status",
        integrationsError.code,
      );
      return NextResponse.json(
        { error: "Unable to load integrations" },
        { status: 500 },
      );
    }
    if (accountsError && accountsError.code !== "42P01") {
      console.error("Failed to load integration accounts", accountsError.code);
    }

    const merged = (integrations || []).map((integration) => {
      const healthData = (health || []).find(
        (item) => item.provider === integration.provider,
      );
      const settings =
        integration.settings_json &&
        typeof integration.settings_json === "object" &&
        !Array.isArray(integration.settings_json)
          ? integration.settings_json
          : {};
      const lastError = healthData?.last_error || "";
      const requiresReconnect =
        healthData?.status === "error" &&
        /token refresh failed|access token is missing|credentials were not found|credentials could not be decrypted|reconnect (google|securely)/i.test(
          lastError,
        );
      const permissions = getGooglePermissionSummary(
        integration.provider,
        "scope" in settings ? settings.scope : undefined,
      );

      return {
        id: integration.id,
        provider: integration.provider,
        status: healthData?.status || integration.status,
        connected_at: integration.connected_at,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
        email: "email" in settings ? settings.email : undefined,
        last_sync_at: healthData?.last_sync_at,
        items_indexed: healthData?.items_indexed || 0,
        activity_summary: healthData?.activity_summary || {},
        requires_reconnect: requiresReconnect,
        humanMessage: requiresReconnect
          ? integration.provider === "gmail" ||
            integration.provider === "google-calendar"
            ? "Google access has expired. Reconnect Google to resume Gmail and Calendar syncing."
            : `${integration.provider} must be reconnected securely.`
          : undefined,
        connection_mode:
          "connection_mode" in settings &&
          typeof settings.connection_mode === "string"
            ? settings.connection_mode
            : "direct",
        permissions,
      };
    });

    return NextResponse.json({
      integrations: merged,
      accounts: accountsError
        ? []
        : (accounts || []).map((account) => ({
            id: account.id,
            provider: account.provider,
            email: account.email,
            display_name: account.display_name,
            status: account.status,
            access_scope: account.access_scope,
            is_primary: account.is_primary,
            connected_at: account.connected_at,
            last_sync_at: account.last_sync_at,
            last_error: account.last_error,
            resources: account.integration_resources || [],
          })),
      connectionOptions: {
        followUpBoss: {
          composioAvailable: isComposioToolkitConfigured("follow_up_boss"),
          canManage: canManageComposioToolkit("follow_up_boss", auth.role),
          writeEnabled: false,
        },
        whatsapp: {
          preferred: isComposioToolkitConfigured("whatsapp")
            ? "composio"
            : "direct",
          composioAvailable: isComposioToolkitConfigured("whatsapp"),
        },
      },
    });
  } catch (error) {
    console.error("Integration status load failed", error);
    return NextResponse.json(
      { error: "Unable to load integrations" },
      { status: 500 },
    );
  }
}

// POST /api/integrations/status - updates health metadata for the caller's org.
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatedOrg();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const provider =
      typeof body.provider === "string" ? body.provider.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (!provider || !status) {
      return NextResponse.json(
        { error: "provider and status are required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("integration_health")
      .upsert({
        org_id: auth.orgId,
        provider,
        status,
        items_indexed:
          typeof body.items_indexed === "number" ? body.items_indexed : 0,
        activity_summary:
          body.activity_summary &&
          typeof body.activity_summary === "object" &&
          !Array.isArray(body.activity_summary)
            ? body.activity_summary
            : {},
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        "provider,status,last_sync_at,items_indexed,activity_summary,updated_at",
      )
      .single();

    if (error) {
      console.error("Failed to update integration health", error.code);
      return NextResponse.json(
        { error: "Unable to update integration health" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Integration health update failed", error);
    return NextResponse.json(
      { error: "Unable to update integration health" },
      { status: 500 },
    );
  }
}
