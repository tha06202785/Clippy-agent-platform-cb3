import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || "",
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || "",
  agency: process.env.STRIPE_PRICE_AGENCY || "",
};

export async function POST(req: NextRequest) {
  try {
    const { planId, orgId } = await req.json();

    if (!planId || planId === "free") {
      return NextResponse.json({ url: "/dashboard" });
    }

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orgId,
      success_url: ,
      cancel_url: ,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
