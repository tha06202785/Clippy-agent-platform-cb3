import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  // Rate limit check
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "dashboard");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org found" }, { status: 400 });

    const orgId = orgMember.org_id;

    const [leadsRes, listingsRes] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("org_id", orgId),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ data: recentLeads }, { data: activeListingsData }] = await Promise.all([
      supabase.from("leads").select("*").eq("org_id", orgId).gte("created_at", thirtyDaysAgo.toISOString()).order("created_at", { ascending: false }).limit(5),
      supabase.from("listings").select("*").eq("org_id", orgId).eq("status", "active"),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        leads: { total: leadsRes.count || 0, new: recentLeads?.length || 0 },
        listings: { total: listingsRes.count || 0, active: activeListingsData?.length || 0 },
      },
      recent_leads: recentLeads || [],
      active_listings: activeListingsData || [],
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
