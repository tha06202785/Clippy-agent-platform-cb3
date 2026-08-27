import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: invite, error } = await admin
      .from("pilot_invites")
      .select("id,status,trial_ends_at")
      .eq("auth_user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();
    if (error) throw error;
    if (!invite?.trial_ends_at || new Date(invite.trial_ends_at) > new Date()) {
      return NextResponse.json(
        { error: "Pilot access is still active" },
        { status: 409 },
      );
    }

    const { error: expiryError } = await admin.rpc("expire_pilot_invite", {
      p_invite_id: invite.id,
    });
    if (expiryError) throw expiryError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pilot expiry failed", error);
    return NextResponse.json(
      { error: "Pilot expiry could not be completed" },
      { status: 500 },
    );
  }
}
