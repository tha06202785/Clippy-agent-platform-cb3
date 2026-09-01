import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationProvider = "google" | "microsoft";
export type IntegrationResourceType = "mail" | "calendar";
export type AdminClient = ReturnType<typeof createAdminClient>;

export type StoredIntegrationAccount = {
  id: string;
  org_id: string;
  connected_by_user_id?: string | null;
  provider: IntegrationProvider;
  external_account_id: string;
  email?: string | null;
  display_name?: string | null;
  status: string;
  access_scope: "personal" | "agency";
  is_primary: boolean;
  credentials_encrypted: string;
  scopes?: string[] | null;
  settings_json?: Record<string, unknown> | null;
  connected_at?: string | null;
  last_sync_at?: string | null;
  last_error?: string | null;
};

type ResourceInput = {
  type: IntegrationResourceType;
  externalId?: string;
  displayName: string;
};

export function normaliseOAuthScopes(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return Array.from(
    new Set(values.map((scope) => String(scope).trim()).filter(Boolean)),
  );
}

export async function upsertIntegrationAccount({
  admin,
  orgId,
  userId,
  provider,
  externalAccountId,
  email,
  displayName,
  credentialsEncrypted,
  scopes,
  settings = {},
  resources,
}: {
  admin: AdminClient;
  orgId: string;
  userId: string;
  provider: IntegrationProvider;
  externalAccountId: string;
  email?: string | null;
  displayName?: string | null;
  credentialsEncrypted: string;
  scopes: string[];
  settings?: Record<string, unknown>;
  resources: ResourceInput[];
}): Promise<StoredIntegrationAccount> {
  const now = new Date().toISOString();
  const accountFields =
    "id,org_id,connected_by_user_id,provider,external_account_id,email,display_name,status,access_scope,is_primary,credentials_encrypted,scopes,settings_json,connected_at,last_sync_at,last_error";

  const { data: exact, error: exactError } = await admin
    .from("integration_accounts")
    .select(accountFields)
    .eq("org_id", orgId)
    .eq("provider", provider)
    .eq("external_account_id", externalAccountId)
    .maybeSingle();
  if (exactError) throw exactError;

  let existing = exact as StoredIntegrationAccount | null;
  if (!existing && email) {
    const { data: emailMatch, error: emailError } = await admin
      .from("integration_accounts")
      .select(accountFields)
      .eq("org_id", orgId)
      .eq("provider", provider)
      .ilike("email", email.trim())
      .limit(1)
      .maybeSingle();
    if (emailError) throw emailError;
    existing = emailMatch as StoredIntegrationAccount | null;
  }

  // The migration creates one legacy Google account before the first OAuth
  // reconnect can identify it. Reuse that row only when it is the sole account.
  if (!existing) {
    const { data: accounts, error: accountsError } = await admin
      .from("integration_accounts")
      .select(accountFields)
      .eq("org_id", orgId)
      .eq("provider", provider)
      .order("created_at", { ascending: true })
      .limit(2);
    if (accountsError) throw accountsError;
    if (
      accounts?.length === 1 &&
      String(accounts[0].external_account_id || "").startsWith("legacy:")
    ) {
      existing = accounts[0] as StoredIntegrationAccount;
    }
  }

  let account: StoredIntegrationAccount;
  if (existing) {
    const { data, error } = await admin
      .from("integration_accounts")
      .update({
        connected_by_user_id: userId,
        external_account_id: externalAccountId,
        email: email || null,
        display_name: displayName || null,
        status: "connected",
        credentials_encrypted: credentialsEncrypted,
        scopes,
        settings_json: {
          ...(existing.settings_json || {}),
          ...settings,
        },
        last_error: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("org_id", orgId)
      .select(accountFields)
      .single();
    if (error || !data) throw error || new Error("Account update failed");
    account = data as StoredIntegrationAccount;
  } else {
    const { count, error: countError } = await admin
      .from("integration_accounts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("provider", provider)
      .neq("status", "disconnected");
    if (countError) throw countError;
    const { data, error } = await admin
      .from("integration_accounts")
      .insert({
        org_id: orgId,
        connected_by_user_id: userId,
        provider,
        external_account_id: externalAccountId,
        email: email || null,
        display_name: displayName || null,
        status: "connected",
        access_scope: "personal",
        is_primary: (count || 0) === 0,
        credentials_encrypted: credentialsEncrypted,
        scopes,
        settings_json: settings,
        connected_at: now,
        updated_at: now,
      })
      .select(accountFields)
      .single();
    if (error || !data) throw error || new Error("Account insert failed");
    account = data as StoredIntegrationAccount;
  }

  for (const resource of resources) {
    const externalResourceId = resource.externalId || "primary";
    const { data: stored, error: storedError } = await admin
      .from("integration_resources")
      .select("id")
      .eq("integration_account_id", account.id)
      .eq("resource_type", resource.type)
      .eq("external_resource_id", externalResourceId)
      .maybeSingle();
    if (storedError) throw storedError;
    if (stored) {
      const { error } = await admin
        .from("integration_resources")
        .update({
          display_name: resource.displayName,
          status: "connected",
          last_error: null,
          updated_at: now,
        })
        .eq("id", stored.id)
        .eq("org_id", orgId);
      if (error) throw error;
    } else {
      const { error } = await admin.from("integration_resources").insert({
        org_id: orgId,
        integration_account_id: account.id,
        resource_type: resource.type,
        external_resource_id: externalResourceId,
        display_name: resource.displayName,
        status: "connected",
        sync_enabled: true,
        send_enabled: true,
        learning_enabled: account.is_primary && resource.type === "mail",
      });
      if (error) throw error;
    }
  }

  return account;
}

export async function getIntegrationAccount({
  admin,
  orgId,
  accountId,
  resourceType,
  capability,
}: {
  admin: AdminClient;
  orgId: string;
  accountId?: string | null;
  resourceType: IntegrationResourceType;
  capability?: "send" | "sync";
}): Promise<StoredIntegrationAccount | null> {
  if (accountId) {
    let query = admin
      .from("integration_accounts")
      .select(
        "id,org_id,connected_by_user_id,provider,external_account_id,email,display_name,status,access_scope,is_primary,credentials_encrypted,scopes,settings_json,connected_at,last_sync_at,last_error,integration_resources!inner(resource_type,status,send_enabled,sync_enabled)",
      )
      .eq("id", accountId)
      .eq("org_id", orgId)
      .eq("status", "connected")
      .eq("integration_resources.resource_type", resourceType)
      .eq("integration_resources.status", "connected");
    if (capability === "send") {
      query = query.eq("integration_resources.send_enabled", true);
    } else if (capability === "sync") {
      query = query.eq("integration_resources.sync_enabled", true);
    }
    const { data, error } = await query
      .maybeSingle();
    if (error) throw error;
    return data as StoredIntegrationAccount | null;
  }

  let query = admin
    .from("integration_accounts")
    .select(
      "id,org_id,connected_by_user_id,provider,external_account_id,email,display_name,status,access_scope,is_primary,credentials_encrypted,scopes,settings_json,connected_at,last_sync_at,last_error,integration_resources!inner(resource_type,status,send_enabled,sync_enabled)",
    )
    .eq("org_id", orgId)
    .eq("status", "connected")
    .eq("is_primary", true)
    .eq("integration_resources.resource_type", resourceType)
    .eq("integration_resources.status", "connected")
    .limit(1);
  if (capability === "send") {
    query = query.eq("integration_resources.send_enabled", true);
  } else if (capability === "sync") {
    query = query.eq("integration_resources.sync_enabled", true);
  }
  const { data, error } = await query
    .maybeSingle();
  if (error) throw error;
  return data as StoredIntegrationAccount | null;
}
