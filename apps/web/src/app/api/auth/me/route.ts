import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's org membership
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("*, orgs(*)")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
      org: orgMember
        ? {
            id: orgMember.org_id,
            name: orgMember.orgs?.name,
            planId: orgMember.orgs?.plan_id,
            role: orgMember.role,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
