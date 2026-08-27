import { NextRequest, NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/lib/admin-access";
import { getAppOrigin } from "@/lib/app-origin";
import {
  addHours,
  createPilotInviteSchema,
  getPilotInviteDisplayStatus,
  getPilotRedirectUrl,
  isPilotInviteActive,
  normalizePilotEmail,
  PILOT_INVITE_VALIDITY_HOURS,
  PILOT_MAX_ACTIVE,
  PILOT_TRIAL_DAYS,
  type PilotInviteRecord,
} from "@/lib/pilot-invites";

export const dynamic = "force-dynamic";

function contextError(status: "unauthenticated" | "forbidden" | "unavailable") {
  if (status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (status === "forbidden") {
    return NextResponse.json(
      { error: "Platform administrator access required" },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { error: "Pilot administration is not configured" },
    { status: 503 },
  );
}

async function listInvites(admin: any): Promise<PilotInviteRecord[]> {
  const { data, error } = await admin
    .from("pilot_invites")
    .select(
      "id,email,auth_user_id,org_id,status,expires_at,accepted_at,trial_ends_at,revoked_at,last_sent_at,send_count,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as PilotInviteRecord[];
}

export async function GET() {
  try {
    const context = await getPlatformAdminContext();
    if (context.status !== "authorized") return contextError(context.status);

    const invites = await listInvites(context.admin);
    const now = new Date();
    return NextResponse.json(
      {
        invites: invites.map((invite) => ({
          ...invite,
          display_status: getPilotInviteDisplayStatus(invite, now),
        })),
        activeCount: invites.filter((invite) =>
          isPilotInviteActive(invite, now),
        ).length,
        limits: {
          maxActive: PILOT_MAX_ACTIVE,
          trialDays: PILOT_TRIAL_DAYS,
          inviteValidityHours: PILOT_INVITE_VALIDITY_HOURS,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Pilot invite listing failed", error);
    return NextResponse.json(
      { error: "Pilot invites could not be loaded" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getPlatformAdminContext();
    if (context.status !== "authorized") return contextError(context.status);

    const parsed = createPilotInviteSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid agent email address" },
        { status: 400 },
      );
    }

    const { admin, user } = context;
    const email = normalizePilotEmail(parsed.data.email);
    const invites = await listInvites(admin);
    const now = new Date();
    const active = invites.filter((invite) => isPilotInviteActive(invite, now));
    if (active.some((invite) => invite.email === email)) {
      return NextResponse.json(
        { error: "This agent already has an active pilot invite" },
        { status: 409 },
      );
    }
    if (active.length >= PILOT_MAX_ACTIVE) {
      return NextResponse.json(
        { error: `The ${PILOT_MAX_ACTIVE}-agent pilot limit has been reached` },
        { status: 409 },
      );
    }

    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: getPilotRedirectUrl(getAppOrigin()),
        data: { access_type: "pilot" },
      });
    if (inviteError || !invited.user) {
      const message = inviteError?.message?.toLowerCase().includes("already")
        ? "This email already has a Clippy account"
        : "The secure pilot invitation could not be emailed";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const expiresAt = addHours(now, PILOT_INVITE_VALIDITY_HOURS).toISOString();
    const { data: invite, error: recordError } = await admin
      .from("pilot_invites")
      .insert({
        email,
        auth_user_id: invited.user.id,
        invited_by: user.id,
        expires_at: expiresAt,
        last_sent_at: now.toISOString(),
      })
      .select(
        "id,email,auth_user_id,org_id,status,expires_at,accepted_at,trial_ends_at,revoked_at,last_sent_at,send_count,created_at",
      )
      .single();
    if (recordError || !invite) {
      await admin.auth.admin.deleteUser(invited.user.id);
      console.error("Pilot invite record failed", recordError);
      return NextResponse.json(
        { error: "The invitation could not be secured; no invite was created" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        invite: { ...invite, display_status: "pending" },
        message: `A private invite was emailed to ${email}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Pilot invite creation failed", error);
    return NextResponse.json(
      { error: "The secure pilot invitation could not be sent" },
      { status: 500 },
    );
  }
}
