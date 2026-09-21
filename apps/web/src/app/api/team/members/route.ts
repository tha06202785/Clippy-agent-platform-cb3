import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, canViewTeamActivity } from "@/lib/team-access";

export const dynamic = "force-dynamic";

type ActivityRow = {
  user_id: string | null;
  category: string;
  title: string;
  impact_summary: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_org_roles")
      .select("org_id,role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) {
      return NextResponse.json({ error: "No organisation" }, { status: 400 });
    }

    const { data: memberships, error: membersError } = await supabase
      .from("user_org_roles")
      .select("user_id,role,created_at")
      .eq("org_id", membership.org_id);
    if (membersError) throw membersError;

    const admin = createAdminClient();
    const ids = (memberships || []).map((item) => item.user_id);
    const mayViewActivity = canViewTeamActivity(membership.role);
    const activitySince = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const activityPromise = mayViewActivity
      ? admin
          .from("clippy_activity_log")
          .select(
            "user_id,category,title,impact_summary,completed_at,created_at",
          )
          .eq("org_id", membership.org_id)
          .in("user_id", ids)
          .gte("created_at", activitySince)
          .order("created_at", { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: [] as ActivityRow[], error: null });

    const [profilesResult, orgResult, activityResult] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id,full_name,phone,avatar_url")
        .in("user_id", ids),
      admin
        .from("orgs")
        .select("name,plan")
        .eq("id", membership.org_id)
        .maybeSingle(),
      activityPromise,
    ]);
    if (profilesResult.error || orgResult.error || activityResult.error) {
      throw profilesResult.error || orgResult.error || activityResult.error;
    }

    const activityByUser = new Map<string, ActivityRow[]>();
    for (const activity of (activityResult.data || []) as ActivityRow[]) {
      if (!activity.user_id) continue;
      const current = activityByUser.get(activity.user_id) || [];
      current.push(activity);
      activityByUser.set(activity.user_id, current);
    }
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

    const formatted = await Promise.all(
      (memberships || []).map(async (member) => {
        const profile = (profilesResult.data || []).find(
          (item) => item.user_id === member.user_id,
        );
        const { data: authUser } = await admin.auth.admin.getUserById(
          member.user_id,
        );
        const memberActivity = activityByUser.get(member.user_id) || [];
        return {
          user_id: member.user_id,
          full_name: profile?.full_name || null,
          email: authUser.user?.email || null,
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null,
          role: member.role,
          created_at: member.created_at,
          is_current_user: member.user_id === user.id,
          activity: mayViewActivity
            ? {
                actions_last_24_hours: memberActivity.filter((item) => {
                  const occurredAt = item.completed_at || item.created_at;
                  return new Date(occurredAt).getTime() >= last24Hours;
                }).length,
                last_active_at:
                  memberActivity[0]?.completed_at ||
                  memberActivity[0]?.created_at ||
                  null,
                recent: memberActivity.slice(0, 5).map((item) => ({
                  category: item.category,
                  title: item.title,
                  impact_summary: item.impact_summary,
                  occurred_at: item.completed_at || item.created_at,
                })),
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      org: {
        name: orgResult.data?.name || "Agency",
        plan: orgResult.data?.plan || "starter",
        member_count: formatted.length,
      },
      permissions: {
        can_manage_team: canManageTeam(membership.role),
        can_view_team_activity: mayViewActivity,
      },
      members: formatted,
    });
  } catch (error) {
    console.error("Team members failed", error);
    return NextResponse.json(
      { error: "Team members are unavailable" },
      { status: 500 },
    );
  }
}
