import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isPilotInviteActive } from "@/lib/pilot-invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const pilotFeedbackSchema = z.object({
  draft_id: z.string().trim().min(1).max(120),
  feedback_code: z.enum([
    "sounds_like_me",
    "too_formal",
    "too_casual",
    "too_sales_focused",
    "incorrect_information",
  ]),
  channel: z
    .enum(["email", "sms", "whatsapp", "facebook", "copy"])
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const parsed = pilotFeedbackSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Choose one of the available draft feedback options" },
        { status: 400 },
      );
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "No organisation is linked to this account" },
        { status: 409 },
      );
    }

    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
      .from("pilot_invites")
      .select("id,status,expires_at,trial_ends_at,org_id")
      .eq("auth_user_id", user.id)
      .eq("org_id", membership.org_id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite || !isPilotInviteActive(invite)) {
      return NextResponse.json(
        { error: "Draft feedback is available during an active private pilot" },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const { data: feedback, error: feedbackError } = await admin
      .from("pilot_feedback")
      .upsert(
        {
          invite_id: invite.id,
          org_id: membership.org_id,
          user_id: user.id,
          feature: "copilot_draft",
          draft_id: parsed.data.draft_id,
          feedback_code: parsed.data.feedback_code,
          channel: parsed.data.channel || null,
          metadata: {
            source: "copilot_draft_card",
            raw_draft_retained: false,
          },
          updated_at: now,
        },
        { onConflict: "invite_id,feature,draft_id" },
      )
      .select("id,feedback_code,created_at,updated_at")
      .single();
    if (feedbackError) throw feedbackError;

    return NextResponse.json({
      success: true,
      feedback,
      message:
        parsed.data.feedback_code === "sounds_like_me"
          ? "Thanks — this draft feels right"
          : "Thanks — edit the draft before approval so Agent DNA can learn the final version",
    });
  } catch (error) {
    console.error("Pilot draft feedback failed", error);
    return NextResponse.json(
      { error: "Your feedback could not be saved" },
      { status: 500 },
    );
  }
}
