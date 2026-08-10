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
  if (!cronSecret) {
    console.error("Google sync disabled: CRON_SECRET is not securely configured");
    return NextResponse.json(
      { error: "Automation is securely disabled" },
      { status: 503 },
    );
  }
  if (!secureSecretMatch(bearerToken(req), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
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
    const { data: member } = await admin
      .from("user_org_roles")
      .select("user_id")
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();
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
