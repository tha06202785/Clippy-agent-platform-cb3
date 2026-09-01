import { NextRequest, NextResponse } from "next/server";
import {
  recordGoogleSyncFailure,
  syncGoogleKnowledge,
} from "@/lib/integrations/google-sync";
import { createClient } from "@/lib/supabase/server";
import { syncMicrosoftKnowledge } from "@/lib/integrations/microsoft-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership?.org_id) {
    return NextResponse.json(
      { error: "No organisation found" },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      provider?: unknown;
      integration_account_id?: unknown;
    };
    const accountId =
      typeof body.integration_account_id === "string"
        ? body.integration_account_id
        : null;
    const provider =
      body.provider === "microsoft" ? "microsoft" : "google";
    if (provider === "microsoft" && !accountId) {
      return NextResponse.json(
        { error: "Select a Microsoft 365 account to sync" },
        { status: 400 },
      );
    }
    const result =
      provider === "microsoft"
        ? await syncMicrosoftKnowledge(
            membership.org_id,
            user.id,
            accountId as string,
          )
        : await syncGoogleKnowledge(membership.org_id, user.id, accountId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Manual Google sync failed", error);
    await recordGoogleSyncFailure(membership.org_id, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Google data could not be synchronised",
      },
      { status: 500 },
    );
  }
}
