import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: membership, error: membershipError } = await supabase
      .from("user_org_roles").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membershipError || !membership) return NextResponse.json({ error: "No organisation" }, { status: 400 });

    const { data: memberships, error: membersError } = await supabase
      .from("user_org_roles").select("user_id,role,created_at").eq("org_id", membership.org_id);
    if (membersError) throw membersError;

    const admin = createAdminClient();
    const ids = (memberships || []).map(item => item.user_id);
    const [{ data: profiles, error: profilesError }, { data: org, error: orgError }] = await Promise.all([
      admin.from("profiles").select("user_id,full_name,phone,avatar_url").in("user_id", ids),
      admin.from("orgs").select("name,plan").eq("id", membership.org_id).maybeSingle(),
    ]);
    if (profilesError || orgError) throw profilesError || orgError;

    const formatted = await Promise.all((memberships || []).map(async member => {
      const profile = (profiles || []).find(item => item.user_id === member.user_id);
      const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
      return {
        user_id: member.user_id,
        full_name: profile?.full_name || null,
        email: authUser.user?.email || null,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        role: member.role,
        created_at: member.created_at,
        is_current_user: member.user_id === user.id,
      };
    }));

    return NextResponse.json({
      org: { name: org?.name || "Agency", plan: org?.plan || "starter", member_count: formatted.length },
      members: formatted,
    });
  } catch (error) {
    console.error("Team members failed", error);
    return NextResponse.json({ error: "Team members are unavailable" }, { status: 500 });
  }
}
