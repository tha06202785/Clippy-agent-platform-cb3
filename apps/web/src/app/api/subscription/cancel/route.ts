import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getBillingAccount,
  getBillingDataClient,
  getStripeClient,
} from "@/lib/billing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const context = await getAdminContext();
  if (context.status === "unavailable") {
    return NextResponse.json(
      { error: "Billing is unavailable in this environment" },
      { status: 503 },
    );
  }
  if (context.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (context.status === "forbidden") {
    return NextResponse.json(
      { error: "Owner or admin access is required" },
      { status: 403 },
    );
  }

  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(
    `${context.user.id}:${ip}`,
    "subscription",
  );
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Too many requests. Try again in " +
          Math.ceil((resetAt - Date.now()) / 1000) +
          " seconds.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 },
    );
  }

  try {
    const account = await getBillingAccount(
      getBillingDataClient(context.supabase),
      context.membership.org_id,
    );
    if (!account?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 },
      );
    }

    // Preserve access through the paid period. Stripe's subscription webhook is
    // the authority for the eventual status transition.
    await stripe.subscriptions.update(account.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at the end of the billing period",
    });
  } catch (error) {
    console.error("Stripe cancellation scheduling failed", error);
    return NextResponse.json(
      { error: "Unable to schedule cancellation" },
      { status: 500 },
    );
  }
}
