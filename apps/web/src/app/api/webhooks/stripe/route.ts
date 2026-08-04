import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  getPlanForPriceId,
  getStripeClient,
  getVerifiedCheckoutIdentity,
} from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function stripeId(
  value: string | { id: string } | Stripe.DeletedCustomer | null,
): string | null {
  if (typeof value === "string") return value;
  return value?.id || null;
}

async function getPlanId(
  supabase: SupabaseClient,
  plan: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("plans")
    .select("id")
    .eq("key", plan)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`Paid plan ${plan} is not configured`);
  }
  return data.id;
}

async function syncCompletedCheckout(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const identity = getVerifiedCheckoutIdentity({
    clientReferenceId: session.client_reference_id,
    metadata: session.metadata || undefined,
    customerId: stripeId(session.customer),
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null,
  });

  if (!identity) {
    throw new Error("Checkout session organisation metadata is invalid");
  }

  const subscription = await stripe.subscriptions.retrieve(
    identity.subscriptionId,
  );
  const subscriptionCustomerId = stripeId(subscription.customer);
  if (subscriptionCustomerId !== identity.customerId) {
    throw new Error("Checkout customer does not own the subscription");
  }

  const paidPlan = getPlanForPriceId(subscription.items.data[0]?.price.id || "");
  if (paidPlan !== identity.plan) {
    throw new Error("Checkout plan does not match the paid Stripe price");
  }

  const planId = await getPlanId(supabase, paidPlan);
  const { error: upsertError } = await supabase
    .from("org_subscriptions")
    .upsert(
      {
        org_id: identity.orgId,
        plan_id: planId,
        stripe_customer_id: identity.customerId,
        stripe_subscription_id: identity.subscriptionId,
        status: subscription.status,
        current_period_start: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );

  if (upsertError) throw upsertError;

  // Keep legacy Stripe identifiers synchronized while older reads are phased
  // out. Entitlements and subscription state come from org_subscriptions.
  const { error: legacySyncError } = await supabase
    .from("orgs")
    .update({
      stripe_customer_id: identity.customerId,
      stripe_subscription_id: identity.subscriptionId,
    })
    .eq("id", identity.orgId);

  if (legacySyncError) {
    console.warn("Legacy organisation billing identifiers were not synced", {
      orgId: identity.orgId,
      message: legacySyncError.message,
    });
  }
}

async function syncSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const customerId = stripeId(subscription.customer);
  if (!customerId) {
    throw new Error("Stripe subscription has no customer");
  }

  const updates: Record<string, unknown> = {
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_start: new Date(
      subscription.current_period_start * 1000,
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000,
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const plan = getPlanForPriceId(subscription.items.data[0]?.price.id || "");
  if (!plan) throw new Error("Stripe subscription price is not configured");
  updates.plan_id = await getPlanId(supabase, plan);

  const { data, error } = await supabase
    .from("org_subscriptions")
    .update(updates)
    .eq("stripe_subscription_id", subscription.id)
    .select("org_id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("No organisation owns this Stripe subscription");
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed":
        await syncCompletedCheckout(
          supabase,
          stripe,
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = stripeId(invoice.customer);
        if (!customerId) throw new Error("Stripe invoice has no customer");

        const { error } = await supabase
          .from("org_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
        if (error) throw error;
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error,
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
