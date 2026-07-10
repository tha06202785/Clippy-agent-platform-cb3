import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24" });

const planPrices: Record<string, string> = {
  solo: process.env.STRIPE_PRICE_SOLO!,
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { plan, orgId } = await req.json();
    const priceId = planPrices[plan];
    if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orgId || userId,
      success_url: origin + "/dashboard?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/pricing",
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
