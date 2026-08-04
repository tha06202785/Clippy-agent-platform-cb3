import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const completionSchema = z.object({
  importCompleted: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const parsed = completionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid onboarding completion state" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: membership, error: membershipError } = await admin
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error(
        "Onboarding completion membership lookup failed",
        membershipError?.code,
      );
      return NextResponse.json(
        { error: "Workspace could not be loaded" },
        { status: 409 },
      );
    }

    const completedAt = new Date().toISOString();
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        is_onboarded: true,
        updated_at: completedAt,
      })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Onboarding profile completion failed", profileError.code);
      return NextResponse.json(
        { error: "Onboarding completion could not be saved" },
        { status: 500 },
      );
    }

    const { error: progressError } = await admin
      .from("onboarding_progress")
      .upsert(
        {
          org_id: membership.org_id,
          current_phase: "complete",
          completed_phases: [0, 1, 2, 3, 4, 5],
          profile_completed: true,
          import_completed: parsed.data.importCompleted,
          completed_at: completedAt,
          updated_at: completedAt,
        },
        { onConflict: "org_id" },
      );

    if (progressError) {
      console.error("Onboarding progress completion failed", progressError.code);
      return NextResponse.json(
        { error: "Onboarding completion could not be saved" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding completion failed", error);
    return NextResponse.json(
      { error: "Onboarding completion could not be saved" },
      { status: 500 },
    );
  }
}
