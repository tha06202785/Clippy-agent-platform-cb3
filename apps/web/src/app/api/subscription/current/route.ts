import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getBillingAccount,
  getBillingDataClient,
  maskBillingEmail,
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

    return NextResponse.json({
      subscription: account
        ? {
            plan: account.plan,
            status: account.status,
            current_period_end: account.currentPeriodEnd,
            cancel_at_period_end: account.cancelAtPeriodEnd,
            billing_identity_status: account.billingIdentityStatus,
            billing_contact_name: account.billingContactName,
            billing_contact_email: maskBillingEmail(
              account.billingContactEmail,
            ),
            billing_contact_phone_last4: account.billingContactPhoneLast4,
          }
        : {
            plan: "free",
            status: "inactive",
            current_period_end: null,
            cancel_at_period_end: false,
            billing_identity_status: "unverified",
            billing_contact_name: null,
            billing_contact_email: null,
            billing_contact_phone_last4: null,
          },
    });
  } catch (error) {
    console.error("Billing account lookup failed", error);
    return NextResponse.json(
      { error: "Unable to load billing details" },
      { status: 500 },
    );
  }
}
