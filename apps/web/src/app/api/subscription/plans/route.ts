import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "subscription/plans");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } }
    );
  }
  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: ["30 AI replies/mo", "3 listings", "Basic inbox", "Morning Briefing"],
    },
    {
      id: "starter",
      name: "Starter",
      price: 29,
      priceId: process.env.STRIPE_STARTER_PRICE_ID,
      features: ["500 AI replies/mo", "25 listings", "WhatsApp + Gmail", "Team features"],
    },
    {
      id: "professional",
      name: "Professional",
      price: 79,
      priceId: process.env.STRIPE_TEAM_PRICE_ID,
      features: ["Unlimited AI replies", "Unlimited listings", "All integrations", "Compliance monitoring"],
    },
    {
      id: "agency",
      name: "Agency",
      price: 199,
      priceId: process.env.STRIPE_AGENCY_PRICE_ID,
      features: ["Everything in Professional", "White-label", "Admin dashboard", "Priority support"],
    },
  ];

  return NextResponse.json(plans);
}
