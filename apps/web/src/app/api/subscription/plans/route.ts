import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { PLANS } from "../../../../../../../packages/shared/src/schemas";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(ip, "subscription/plans");
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Build plans response from canonical PLANS definition (packages/shared)
  const plans = [
    {
      id: "free",
      name: PLANS.free.name,
      price: PLANS.free.price,
      priceLabel: PLANS.free.priceLabel,
      features: ["30 AI replies/month", "5 listings", "Basic inbox", "Morning Briefing"],
    },
    {
      id: "solo",
      name: PLANS.solo.name,
      price: PLANS.solo.price,
      priceLabel: PLANS.solo.priceLabel,
      priceId: process.env.STRIPE_SOLO_PRICE_ID,
      features: [
        "500 AI replies/month",
        "50 listings",
        "WhatsApp / Gmail / Calendar",
        "AI Copilot",
        "Morning Briefing",
        "Email support",
      ],
    },
    {
      id: "professional",
      name: PLANS.professional.name,
      price: PLANS.professional.price,
      priceLabel: PLANS.professional.priceLabel,
      priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      isPerAgent: false,
      features: [
        "Unlimited AI replies",
        "Unlimited listings",
        "All integrations",
        "AI Copilot",
        "Morning Briefing",
        "Compliance monitoring",
        "Priority support",
      ],
    },
    {
      id: "team",
      name: PLANS.team.name,
      price: PLANS.team.price,
      priceLabel: PLANS.team.priceLabel,
      priceId: process.env.STRIPE_TEAM_PRICE_ID,
      isPerAgent: true,
      features: [
        "Everything in Professional",
        "Shared lead pool",
        "Team inbox",
        "Lead routing",
        "Role-based access",
        "Advanced automations",
        "Bulk messaging",
        "Priority support",
      ],
    },
    {
      id: "enterprise",
      name: PLANS.enterprise.name,
      price: PLANS.enterprise.price,
      priceLabel: PLANS.enterprise.priceLabel,
      priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
      isPerAgent: true,
      features: [
        "Everything in Team",
        "White-label branding",
        "Executive dashboard",
        "Board report PDF",
        "Custom AI training",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
      ],
    },
  ];

  // Fetch real invoices from Stripe for authenticated users
  let invoices: any[] = [];
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: orgMember } = await supabase
        .from("user_org_roles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (orgMember) {
        const { data: org } = await supabase
          .from("orgs")
          .select("stripe_customer_id")
          .eq("id", orgMember.org_id)
          .single();

        if (org?.stripe_customer_id) {
          const stripeInvoices = await stripe.invoices.list({
            customer: org.stripe_customer_id,
            limit: 20,
          });
          invoices = stripeInvoices.data.map((inv) => ({
            id: inv.id,
            created: inv.created,
            hosted_invoice_url: inv.hosted_invoice_url,
            amount_paid: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            lines: inv.lines,
          }));
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch Stripe invoices:", err);
    // Non-fatal — return plans without invoices
  }

  return NextResponse.json({ plans, invoices });
}
