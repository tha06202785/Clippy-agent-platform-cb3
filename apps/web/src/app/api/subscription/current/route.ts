import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "subscription");
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) {
      return NextResponse.json({ plan: "free", status: "none" });
    }

    const { data: org } = await supabase
      .from("orgs")
      .select("plan_id, stripe_subscription_id, ai_replies_used, ai_replies_limit, listings_used, listings_limit, leads_used, leads_limit")
      .eq("id", orgMember.org_id)
      .single();

    if (!org) {
      return NextResponse.json({ plan: "free", status: "none" });
    }

    return NextResponse.json({
      plan: org.plan_id,
      status: org.stripe_subscription_id ? "active" : "inactive",
      usage: {
        ai_replies: { used: org.ai_replies_used, limit: org.ai_replies_limit },
        listings: { used: org.listings_used, limit: org.listings_limit },
        leads: { used: org.leads_used, limit: org.leads_limit },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
