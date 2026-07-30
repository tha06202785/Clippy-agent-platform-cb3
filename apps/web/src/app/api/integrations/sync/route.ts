import { NextResponse } from "next/server";
import {
  recordGoogleSyncFailure,
  syncGoogleKnowledge,
} from "@/lib/integrations/google-sync";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
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
    const result = await syncGoogleKnowledge(membership.org_id, user.id);
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
