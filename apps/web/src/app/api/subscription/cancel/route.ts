import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST() {
  // Rate limit check
  const ip = getClientIp(req);
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
      return NextResponse.json({ error: "No org found" }, { status: 400 });
    }

    const { data: org } = await supabase
      .from("orgs")
      .select("stripe_subscription_id")
      .eq("id", orgMember.org_id)
      .single();

    if (!org?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    await stripe.subscriptions.cancel(org.stripe_subscription_id);

    await supabase
      .from("orgs")
      .update({ plan_id: "free", stripe_subscription_id: null })
      .eq("id", orgMember.org_id);

    return NextResponse.json({ success: true, message: "Subscription cancelled" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
