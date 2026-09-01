import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getBillingAccount,
  getBillingDataClient,
  getStripeClient,
} from "@/lib/billing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
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

  try {
    const account = await getBillingAccount(
      getBillingDataClient(context.supabase),
      context.membership.org_id,
    );
    if (!account?.stripeCustomerId) {
      return NextResponse.json({ invoices: [] });
    }
    if (account.billingIdentityStatus !== "verified") {
      return NextResponse.json(
        {
          error:
            "Billing identity must be verified before invoices are available.",
        },
        { status: 409 },
      );
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Billing is not configured" },
        { status: 503 },
      );
    }

    const result = await stripe.invoices.list({
      customer: account.stripeCustomerId,
      limit: 20,
    });

    const invoices = result.data.map((invoice) => ({
      id: invoice.id,
      created: invoice.created,
      hosted_invoice_url: invoice.hosted_invoice_url,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      description:
        invoice.description || invoice.lines.data[0]?.description || null,
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Stripe invoice lookup failed", error);
    return NextResponse.json(
      { error: "Unable to load invoices" },
      { status: 500 },
    );
  }
}
