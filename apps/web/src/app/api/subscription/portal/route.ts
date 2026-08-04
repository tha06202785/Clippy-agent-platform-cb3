import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getAppUrl,
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
  const { allowed } = checkRateLimit(
    `${context.user.id}:${ip}`,
    "subscription",
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
    if (!account?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 400 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${getAppUrl()}/admin/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal creation failed", error);
    return NextResponse.json(
      { error: "Unable to open the billing portal" },
      { status: 500 },
    );
  }
}
