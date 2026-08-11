import { NextRequest, NextResponse } from "next/server";
import {
  bearerToken,
  readAutomationSecret,
  secureSecretMatch,
} from "@/lib/automation-security";
import { processInspectionReminders } from "@/lib/inspections/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const requestSecret = bearerToken(req);
  const cronSecret = readAutomationSecret("CRON_SECRET");
  const admin = createAdminClient();
  let authorised = cronSecret
    ? secureSecretMatch(requestSecret, cronSecret)
    : false;

  if (!authorised && requestSecret) {
    const { data, error } = await admin.rpc("verify_automation_secret", {
      p_name: "inspection-reminders",
      p_secret: requestSecret,
    });
    if (error) {
      console.error(
        "Inspection reminder secret verification failed",
        error.code,
      );
    }
    authorised = data === true;
  }
  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      success: true,
      ...(await processInspectionReminders(admin)),
    });
  } catch (error) {
    console.error("Inspection reminder processing failed", error);
    return NextResponse.json(
      { error: "Inspection reminders could not be processed" },
      { status: 500 },
    );
  }
}
