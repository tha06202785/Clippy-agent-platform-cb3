import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  recordGoogleSyncFailure,
  syncGoogleKnowledge,
} from "@/lib/integrations/google-sync";
import {
  bearerToken,
  readAutomationSecret,
  secureSecretMatch,
} from "@/lib/automation-security";
import { syncMicrosoftKnowledge } from "@/lib/integrations/microsoft-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = readAutomationSecret("CRON_SECRET");
  const requestSecret = bearerToken(req);
  const admin = createAdminClient();
  let authorised = cronSecret
    ? secureSecretMatch(requestSecret, cronSecret)
    : false;

  if (!authorised && requestSecret) {
    const { data, error } = await admin.rpc("verify_automation_secret", {
      p_name: "google-sync",
      p_secret: requestSecret,
    });
    if (error) {
      console.error(
        "Google sync database secret verification failed",
        error.code,
      );
    }
    authorised = data === true;
  }

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accounts, error: accountError } = await admin
    .from("integration_accounts")
    .select(
      "id,org_id,provider,connected_by_user_id,integration_resources!inner(resource_type,status,sync_enabled)",
    )
    .eq("status", "connected")
    .eq("integration_resources.resource_type", "mail")
    .eq("integration_resources.status", "connected")
    .eq("integration_resources.sync_enabled", true)
    .limit(20);
  let integrations: Array<{
    id?: string | null;
    org_id: string;
    provider: "google" | "microsoft";
    connected_by_user_id?: string | null;
  }> = (accounts || []) as Array<{
    id: string;
    org_id: string;
    provider: "google" | "microsoft";
    connected_by_user_id?: string | null;
  }>;
  if (accountError?.code === "42P01") {
    const { data: legacy, error: legacyError } = await admin
      .from("integrations")
      .select("org_id")
      .eq("provider", "gmail")
      .eq("status", "connected")
      .limit(10);
    if (legacyError) {
      console.error("Google sync cron integration lookup failed", legacyError.code);
      return NextResponse.json(
        { error: "Unable to load connected organisations" },
        { status: 500 },
      );
    }
    integrations = (legacy || []).map((item) => ({
      org_id: item.org_id,
      provider: "google" as const,
    }));
  } else if (accountError) {
    console.error("Account sync cron lookup failed", accountError.code);
    return NextResponse.json(
      { error: "Unable to load connected organisations" },
      { status: 500 },
    );
  }

  const results = [];
  for (const account of integrations) {
    const orgId = account.org_id;
    const { data: learner } = await admin
      .from("communication_learning_settings")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("learning_enabled", true)
      .eq("learn_from_sent", true)
      .limit(1)
      .maybeSingle();
    const { data: fallbackMember } = learner?.user_id
      ? { data: null }
      : await admin
          .from("user_org_roles")
          .select("user_id")
          .eq("org_id", orgId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
    const member = account.connected_by_user_id
      ? { user_id: account.connected_by_user_id }
      : learner || fallbackMember;
    if (!member?.user_id) {
      results.push({ org_id: orgId, success: false, error: "No org member" });
      continue;
    }

    try {
      const result =
        account.provider === "microsoft" && account.id
          ? await syncMicrosoftKnowledge(orgId, member.user_id, account.id)
          : await syncGoogleKnowledge(orgId, member.user_id, account.id);
      results.push({
        org_id: orgId,
        integration_account_id: account.id || null,
        provider: account.provider,
        success: true,
        ...result,
      });
    } catch (syncError) {
      console.error("Scheduled Google sync failed", orgId, syncError);
      await recordGoogleSyncFailure(orgId, syncError);
      results.push({
        org_id: orgId,
        integration_account_id: account.id || null,
        provider: account.provider,
        success: false,
        error:
          syncError instanceof Error ? syncError.message : "Google sync failed",
      });
    }
  }

  return NextResponse.json({
    success: results.every((result) => result.success),
    organisations_processed: results.length,
    results,
  });
}
