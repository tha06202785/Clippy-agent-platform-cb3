import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAdminContext } from "@/lib/admin-access";
import { getAppOrigin } from "@/lib/app-origin";
import {
  addHours,
  getPilotRedirectUrl,
  normalizePilotEmail,
  pilotInviteActionSchema,
  PILOT_INVITE_VALIDITY_HOURS,
  type PilotInviteRecord,
} from "@/lib/pilot-invites";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: "Invalid pilot invitation" },
      { status: 400 },
    );
  }
  const parsed = pilotInviteActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid pilot action" },
      { status: 400 },
    );
  }

  try {
    const context = await getPlatformAdminContext();
    if (context.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (context.status === "forbidden") {
      return NextResponse.json(
        { error: "Platform administrator access required" },
        { status: 403 },
      );
    }
    if (context.status === "unavailable") {
      return NextResponse.json(
        { error: "Pilot administration is not configured" },
        { status: 503 },
      );
    }

    const { admin, user } = context;
    const { data, error } = await admin
      .from("pilot_invites")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Pilot invitation not found" },
        { status: 404 },
      );
    }
    const invite = data as PilotInviteRecord;
    const now = new Date();

    if (parsed.data.action === "revoke") {
      if (!["pending", "accepted"].includes(invite.status)) {
        return NextResponse.json(
          { error: "This pilot invitation is no longer active" },
          { status: 409 },
        );
      }
      const { error: revokeError } = await admin.rpc("revoke_pilot_invite", {
        p_invite_id: id,
        p_actor_id: user.id,
      });
      if (revokeError) throw revokeError;
      if (invite.status === "pending" && invite.auth_user_id) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(
          invite.auth_user_id,
        );
        if (deleteError)
          console.error("Pending pilot user cleanup failed", deleteError);
      }
      return NextResponse.json({
        success: true,
        message: "Pilot access revoked",
      });
    }

    if (parsed.data.action === "extend") {
      if (!["accepted", "expired"].includes(invite.status) || !invite.org_id) {
        return NextResponse.json(
          { error: "Only an active pilot can be extended" },
          { status: 409 },
        );
      }
      const { data: trialEndsAt, error: extendError } = await admin.rpc(
        "extend_pilot_invite",
        {
          p_invite_id: id,
          p_days: parsed.data.days,
          p_actor_id: user.id,
        },
      );
      if (extendError) throw extendError;
      return NextResponse.json({ success: true, trialEndsAt });
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Only a pending invitation can be resent" },
        { status: 409 },
      );
    }

    const email = normalizePilotEmail(invite.email);
    const { error: revokeOldError } = await admin
      .from("pilot_invites")
      .update({
        status: "revoked",
        revoked_at: now.toISOString(),
        revoked_by: user.id,
        updated_at: now.toISOString(),
      })
      .eq("id", id);
    if (revokeOldError) throw revokeOldError;
    if (invite.auth_user_id) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(
        invite.auth_user_id,
      );
      if (deleteError) {
        return NextResponse.json(
          { error: "The old invitation could not be invalidated" },
          { status: 500 },
        );
      }
    }

    const { data: reinvited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: getPilotRedirectUrl(getAppOrigin()),
        data: { access_type: "pilot" },
      });
    if (inviteError || !reinvited.user) {
      return NextResponse.json(
        {
          error: "The old link was revoked, but a new email could not be sent",
        },
        { status: 500 },
      );
    }

    const { error: recordError } = await admin.from("pilot_invites").insert({
      email,
      auth_user_id: reinvited.user.id,
      invited_by: user.id,
      expires_at: addHours(now, PILOT_INVITE_VALIDITY_HOURS).toISOString(),
      last_sent_at: now.toISOString(),
      send_count: invite.send_count + 1,
    });
    if (recordError) {
      await admin.auth.admin.deleteUser(reinvited.user.id);
      throw recordError;
    }
    return NextResponse.json({
      success: true,
      message: `A new link was emailed to ${email}`,
    });
  } catch (error) {
    console.error("Pilot invitation action failed", error);
    return NextResponse.json(
      { error: "The pilot invitation could not be updated" },
      { status: 500 },
    );
  }
}
