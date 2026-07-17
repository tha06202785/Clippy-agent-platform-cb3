import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  team: "Team",
  office: "Office",
  agency: "Agency",
  professional: "Professional",
};

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(ip, "subscription/plans");
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: ["30 AI replies/month", "5 listings", "Basic inbox", "Morning Briefing"],
    },
    {
      id: "starter",
      name: "Starter",
      price: 29,
      priceId: process.env.STRIPE_STARTER_PRICE_ID,
      features: [
        "500 AI replies/month",
        "50 listings",
        "WhatsApp / Gmail / Calendar",
        "AI Copilot",
        "Morning Briefing",
      ],
    },
    {
      id: "team",
      name: "Team",
      price: 79,
      priceId: process.env.STRIPE_TEAM_PRICE_ID,
      isPerAgent: true,
      features: [
        "Unlimited AI replies",
        "Unlimited listings",
        "All integrations",
        "Shared lead pool",
        "Team inbox",
        "Lead routing",
        "Role-based access",
        "Compliance monitoring",
      ],
    },
    {
      id: "office",
      name: "Office",
      price: 149,
      priceId: process.env.STRIPE_OFFICE_PRICE_ID,
      isPerAgent: true,
      features: [
        "Everything in Team",
        "AI Copilot per agent",
        "API access",
        "Advanced automations",
        "Custom AI training",
        "Bulk messaging",
        "Priority support",
      ],
    },
    {
      id: "agency",
      name: "Agency",
      price: 199,
      priceId: process.env.STRIPE_AGENCY_PRICE_ID,
      isPerAgent: true,
      features: [
        "Everything in Office",
        "White-label branding",
        "Executive dashboard",
        "Board report PDF",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  ];

  // If authenticated, also fetch real invoices from Stripe
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let invoices: any[] = [];

    if (user) {
      const { data: orgMember } = await supabase
        .from("org_members")
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
          try {
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
          } catch {
            // Non-fatal — return plans without invoices
          }
        }
      }
    }

    return NextResponse.json({ plans, invoices });
  } catch {
    return NextResponse.json({ plans, invoices: [] });
  }
}
