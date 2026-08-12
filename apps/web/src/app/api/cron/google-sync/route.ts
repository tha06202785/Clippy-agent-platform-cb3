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

  const { data: integrations, error } = await admin
    .from("integrations")
    .select("org_id")
    .eq("provider", "gmail")
    .eq("status", "connected")
    .limit(10);
  if (error) {
    console.error("Google sync cron integration lookup failed", error.code);
    return NextResponse.json(
      { error: "Unable to load connected organisations" },
      { status: 500 },
    );
  }

  const results = [];
  for (const { org_id: orgId } of integrations || []) {
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
    const member = learner || fallbackMember;
    if (!member?.user_id) {
      results.push({ org_id: orgId, success: false, error: "No org member" });
      continue;
    }

    try {
      const result = await syncGoogleKnowledge(orgId, member.user_id);
      results.push({ org_id: orgId, success: true, ...result });
    } catch (syncError) {
      console.error("Scheduled Google sync failed", orgId, syncError);
      await recordGoogleSyncFailure(orgId, syncError);
      results.push({
        org_id: orgId,
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
