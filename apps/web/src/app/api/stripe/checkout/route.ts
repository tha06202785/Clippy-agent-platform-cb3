import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getAppUrl,
  getBillingAccount,
  getBillingDataClient,
  getPlanPriceId,
  getStripeClient,
  isPaidCheckoutEnabled,
} from "@/lib/billing";
import { checkoutSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    "stripe",
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

  if (!isPaidCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Paid checkout is not enabled for this environment" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const validation = validate(checkoutSchema, body);
    if (!validation.success || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { plan } = validation.data;
    const priceId = getPlanPriceId(plan);
    const stripe = getStripeClient();
    if (!priceId || !stripe) {
      return NextResponse.json(
        { error: "This plan is not available for checkout" },
        { status: 503 },
      );
    }

    const orgId = context.membership.org_id;
    const billingAccount = await getBillingAccount(
      getBillingDataClient(context.supabase),
      orgId,
    );
    if (
      billingAccount?.stripeSubscriptionId &&
      ["active", "trialing", "past_due"].includes(billingAccount.status)
    ) {
      return NextResponse.json(
        {
          error:
            "This organisation already has a subscription. Use the billing portal to change it.",
        },
        { status: 409 },
      );
    }

    const appUrl = getAppUrl();
    const metadata = {
      user_id: context.user.id,
      org_id: orgId,
      plan,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(billingAccount?.stripeCustomerId
        ? { customer: billingAccount.stripeCustomerId }
        : { customer_email: context.user.email }),
      client_reference_id: orgId,
      success_url: `${appUrl}/admin/billing?checkout=success`,
      cancel_url: `${appUrl}/pricing`,
      metadata,
      subscription_data: { metadata },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    return NextResponse.json(
      { error: "Unable to start checkout" },
      { status: 500 },
    );
  }
}
