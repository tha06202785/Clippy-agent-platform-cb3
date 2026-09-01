import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getBillingContactFromUser,
  getAppUrl,
  getBillingAccount,
  getBillingDataClient,
  getPlanPriceId,
  getStripeClient,
  isPaidCheckoutEnabled,
  stripeCustomerMatchesBillingContact,
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
  if (context.isPlatformAdmin) {
    return NextResponse.json(
      {
        error:
          "Platform administrators cannot become a customer billing contact. Sign in as the organisation owner or admin.",
      },
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
    const billingContact = getBillingContactFromUser(context.user);
    if (!billingContact) {
      return NextResponse.json(
        {
          error:
            "Your signed-in account needs a verified email before starting checkout.",
        },
        { status: 409 },
      );
    }

    const billingData = getBillingDataClient(context.supabase);
    const billingAccount = await getBillingAccount(billingData, orgId);
    if (
      billingAccount?.stripeSubscriptionId &&
      ["active", "trialing", "past_due"].includes(billingAccount.status)
    ) {
      if (billingAccount.billingIdentityStatus !== "verified") {
        return NextResponse.json(
          {
            error:
              "This organisation's billing identity requires review before another checkout can start.",
          },
          { status: 409 },
        );
      }
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
      user_id: billingContact.userId,
      org_id: orgId,
      plan,
      billing_contact_user_id: billingContact.userId,
    };

    let customerId: string | null = null;
    if (billingAccount?.stripeCustomerId) {
      const existingCustomer = await stripe.customers.retrieve(
        billingAccount.stripeCustomerId,
      );
      if (
        stripeCustomerMatchesBillingContact(existingCustomer, {
          orgId,
          contact: billingContact,
        })
      ) {
        customerId = existingCustomer.id;
      } else if (billingAccount.stripeSubscriptionId) {
        await billingData
          .from("org_subscriptions")
          .update({
            billing_identity_status: "requires_review",
            billing_identity_verified_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId);
        await billingData.from("billing_audit_events").insert({
          org_id: orgId,
          actor_user_id: billingContact.userId,
          event_type: "checkout_identity_mismatch",
          outcome: "blocked",
          details: { plan },
        });
        return NextResponse.json(
          {
            error:
              "The saved Stripe customer belongs to a different billing identity. Support review is required.",
          },
          { status: 409 },
        );
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: billingContact.email,
          ...(billingContact.name ? { name: billingContact.name } : {}),
          ...(billingContact.phone ? { phone: billingContact.phone } : {}),
          metadata: {
            org_id: orgId,
            billing_contact_user_id: billingContact.userId,
            source: "clippy_checkout",
          },
        },
        {
          idempotencyKey: `billing-customer:${orgId}:${billingContact.userId}`,
        },
      );
      customerId = customer.id;
    }

    const { data: planRow, error: planError } = await billingData
      .from("plans")
      .select("id")
      .eq("key", plan)
      .eq("is_active", true)
      .maybeSingle();
    if (planError || !planRow?.id) {
      throw planError || new Error("Paid plan is not configured");
    }

    const checkoutStartedAt = new Date().toISOString();
    const { error: identityError } = await billingData
      .from("org_subscriptions")
      .upsert(
        {
          org_id: orgId,
          plan_id: planRow.id,
          stripe_customer_id: customerId,
          status: billingAccount?.status || "incomplete",
          billing_contact_user_id: billingContact.userId,
          billing_contact_email: billingContact.email,
          billing_contact_name: billingContact.name,
          billing_identity_status: "pending",
          billing_identity_verified_at: null,
          checkout_started_at: checkoutStartedAt,
          updated_at: checkoutStartedAt,
        },
        { onConflict: "org_id" },
      );
    if (identityError) throw identityError;

    const fiveMinuteBucket = Math.floor(Date.now() / 300_000);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        customer_update: { address: "auto", name: "auto" },
        phone_number_collection: { enabled: true },
        billing_address_collection: "required",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: orgId,
        success_url: `${appUrl}/admin/billing?checkout=success`,
        cancel_url: `${appUrl}/pricing`,
        metadata,
        subscription_data: { metadata },
      },
      {
        idempotencyKey: `checkout:${orgId}:${billingContact.userId}:${plan}:${fiveMinuteBucket}`,
      },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    await billingData.from("billing_audit_events").insert({
      org_id: orgId,
      actor_user_id: billingContact.userId,
      event_type: "checkout_started",
      outcome: "success",
      details: { plan, checkout_session_id: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    return NextResponse.json(
      { error: "Unable to start checkout" },
      { status: 500 },
    );
  }
}
