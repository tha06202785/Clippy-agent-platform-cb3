import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(ip, "subscription");
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ plan: "free", status: "none" });

    const { data: org } = await supabase
      .from("orgs")
      .select("plan, stripe_customer_id, stripe_subscription_id")
      .eq("id", orgMember.org_id)
      .single();

    if (!org) return NextResponse.json({ plan: "free", status: "none" });

    // Look up live Stripe subscription status if we have a stripe sub ID
    let stripeStatus: string | null = null;
    let periodEnd: string | null = null;

    if (org.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        stripeStatus = sub.status;
        periodEnd = String(sub.current_period_end);
      } catch {
        // Stripe sub not found — treat as inactive
        stripeStatus = "canceled";
      }
    }

    // Map Stripe status to our own status, falling back to org.plan
    const status =
      stripeStatus === "active" || stripeStatus === "trialing"
        ? "active"
        : stripeStatus === "past_due"
        ? "past_due"
        : stripeStatus === "canceled" || stripeStatus === "unpaid"
        ? "canceled"
        : "inactive";

    return NextResponse.json({
      plan: org.plan,
      status,
      current_period_end: periodEnd,
      stripe_subscription_id: org.stripe_subscription_id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
