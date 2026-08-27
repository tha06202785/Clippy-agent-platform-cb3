import { NextResponse } from "next/server";
import { normalizePilotEmail } from "@/lib/pilot-invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "Sign in from your invitation first" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const email = normalizePilotEmail(user.email);
    const { data: invite, error: inviteError } = await admin
      .from("pilot_invites")
      .select("id,status,expires_at,trial_ends_at")
      .eq("auth_user_id", user.id)
      .eq("email", email)
      .in("status", ["pending", "accepted"])
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) {
      return NextResponse.json(
        {
          error: "No valid private pilot invitation was found for this account",
        },
        { status: 403 },
      );
    }
    if (
      invite.status === "pending" &&
      new Date(invite.expires_at) <= new Date()
    ) {
      await admin
        .from("pilot_invites")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", invite.id);
      return NextResponse.json(
        { error: "This invitation has expired. Ask Clippy to send a new one" },
        { status: 410 },
      );
    }

    const { data, error } = await admin.rpc("activate_pilot_invite", {
      p_invite_id: invite.id,
      p_user_id: user.id,
    });
    if (error) {
      const code = error.message || "";
      const message = code.includes("pilot_user_already_has_workspace")
        ? "This account already belongs to a Clippy workspace"
        : code.includes("pilot_invite_expired")
          ? "This invitation has expired. Ask Clippy to send a new one"
          : "This private pilot invitation could not be activated";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const activation = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      success: true,
      orgId: activation?.pilot_org_id,
      trialEndsAt: activation?.pilot_trial_ends_at,
      next: "/onboarding?pilot=1",
    });
  } catch (error) {
    console.error("Pilot activation failed", error);
    return NextResponse.json(
      { error: "Pilot access could not be activated" },
      { status: 500 },
    );
  }
}
