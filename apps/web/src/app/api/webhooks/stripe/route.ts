import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  checkoutEmailMatchesBillingContact,
  getPhoneLast4,
  getPlanForPriceId,
  getStripeClient,
  getVerifiedCheckoutIdentity,
  stripeCustomerMatchesBillingContact,
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

async function hasCurrentBillingOwner(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_org_roles")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function requireVerifiedSubscriptionOwner(
  supabase: SupabaseClient,
  subscriptionId: string,
) {
  const { data, error } = await supabase
    .from("org_subscriptions")
    .select(
      "org_id,billing_contact_user_id,billing_contact_email,billing_contact_name,billing_identity_status,stripe_customer_id",
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  if (
    !data?.org_id ||
    !data.billing_contact_user_id ||
    !data.billing_contact_email ||
    data.billing_identity_status !== "verified"
  ) {
    throw new Error("Stripe subscription billing identity is not verified");
  }
  if (
    !(await hasCurrentBillingOwner(
      supabase,
      data.org_id,
      data.billing_contact_user_id,
    ))
  ) {
    await supabase
      .from("org_subscriptions")
      .update({
        billing_identity_status: "requires_review",
        billing_identity_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", data.org_id);
    throw new Error("Stripe billing contact is no longer an owner or admin");
  }
  return data;
}

async function syncCompletedCheckout(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
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

  if (!identity?.userId) {
    throw new Error("Checkout session organisation metadata is invalid");
  }

  const { data: pendingAccount, error: pendingError } = await supabase
    .from("org_subscriptions")
    .select(
      "billing_contact_user_id,billing_contact_email,billing_contact_name,stripe_customer_id",
    )
    .eq("org_id", identity.orgId)
    .maybeSingle();
  if (pendingError) throw pendingError;
  if (
    !pendingAccount?.billing_contact_email ||
    pendingAccount.billing_contact_user_id !== identity.userId ||
    pendingAccount.stripe_customer_id !== identity.customerId
  ) {
    throw new Error(
      "Checkout billing contact does not match the pending account",
    );
  }
  if (
    !(await hasCurrentBillingOwner(supabase, identity.orgId, identity.userId))
  ) {
    await supabase
      .from("org_subscriptions")
      .update({
        billing_identity_status: "requires_review",
        billing_identity_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", identity.orgId);
    throw new Error("Checkout billing contact is not an organisation owner");
  }
  if (
    !checkoutEmailMatchesBillingContact(
      session.customer_details?.email,
      pendingAccount.billing_contact_email,
    )
  ) {
    await supabase
      .from("org_subscriptions")
      .update({
        billing_identity_status: "requires_review",
        billing_identity_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", identity.orgId);
    throw new Error("Checkout email does not match the billing contact");
  }

  const customer = await stripe.customers.retrieve(identity.customerId);
  if (
    !stripeCustomerMatchesBillingContact(customer, {
      orgId: identity.orgId,
      contact: {
        userId: identity.userId,
        email: pendingAccount.billing_contact_email,
        name: pendingAccount.billing_contact_name,
        phone: session.customer_details?.phone || null,
      },
    })
  ) {
    throw new Error("Stripe customer ownership metadata is invalid");
  }

  const subscription = await stripe.subscriptions.retrieve(
    identity.subscriptionId,
  );
  const subscriptionCustomerId = stripeId(subscription.customer);
  if (subscriptionCustomerId !== identity.customerId) {
    throw new Error("Checkout customer does not own the subscription");
  }

  const paidPlan = getPlanForPriceId(
    subscription.items.data[0]?.price.id || "",
  );
  if (paidPlan !== identity.plan) {
    throw new Error("Checkout plan does not match the paid Stripe price");
  }

  const verifiedAt = new Date().toISOString();
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
        billing_contact_user_id: identity.userId,
        billing_contact_email: pendingAccount.billing_contact_email,
        billing_contact_name:
          session.customer_details?.name || pendingAccount.billing_contact_name,
        billing_contact_phone_last4: getPhoneLast4(
          session.customer_details?.phone,
        ),
        billing_identity_status: "verified",
        billing_identity_verified_at: verifiedAt,
        updated_at: verifiedAt,
      },
      { onConflict: "org_id" },
    );

  if (upsertError) throw upsertError;

  await stripe.customers.update(identity.customerId, {
    ...(session.customer_details?.name
      ? { name: session.customer_details.name }
      : {}),
    ...(session.customer_details?.phone
      ? { phone: session.customer_details.phone }
      : {}),
    metadata: {
      org_id: identity.orgId,
      billing_contact_user_id: identity.userId,
      source: "clippy_checkout",
    },
  });

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

  await supabase.from("billing_audit_events").insert({
    org_id: identity.orgId,
    actor_user_id: identity.userId,
    event_type: "billing_identity_verified",
    outcome: "success",
    stripe_event_id: eventId,
    details: { plan: paidPlan },
  });
}

async function syncSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const customerId = stripeId(subscription.customer);
  if (!customerId) throw new Error("Stripe subscription has no customer");

  const owner = await requireVerifiedSubscriptionOwner(
    supabase,
    subscription.id,
  );
  if (owner.stripe_customer_id !== customerId) {
    throw new Error("Subscription customer does not match the verified owner");
  }

  const plan = getPlanForPriceId(subscription.items.data[0]?.price.id || "");
  if (!plan) throw new Error("Stripe subscription price is not configured");

  const { error } = await supabase
    .from("org_subscriptions")
    .update({
      status: subscription.status,
      plan_id: await getPlanId(supabase, plan),
      current_period_start: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
  if (error) throw error;

  await supabase.from("billing_audit_events").insert({
    org_id: owner.org_id,
    actor_user_id: owner.billing_contact_user_id,
    event_type: "subscription_synced",
    outcome: "success",
    stripe_event_id: eventId,
    details: { status: subscription.status, plan },
  });
}

async function claimWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<{ rowId: string; duplicate: boolean }> {
  const object = event.data.object as { id?: string };
  const inserted = await supabase
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_object_id: object.id || null,
      livemode: event.livemode,
      status: "processing",
    })
    .select("id")
    .single();
  if (!inserted.error && inserted.data?.id) {
    return { rowId: inserted.data.id, duplicate: false };
  }
  if (inserted.error?.code !== "23505") throw inserted.error;

  const { data: existing, error: existingError } = await supabase
    .from("stripe_webhook_events")
    .select("id,status,attempt_count")
    .eq("stripe_event_id", event.id)
    .single();
  if (existingError || !existing) {
    throw existingError || new Error("Unable to load webhook event claim");
  }
  if (existing.status === "processed") {
    return { rowId: existing.id, duplicate: true };
  }

  const { error: retryError } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempt_count: existing.attempt_count + 1,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (retryError) throw retryError;
  return { rowId: existing.id, duplicate: false };
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

  const supabase = createAdminClient();
  let webhookRowId: string | null = null;
  try {
    const claim = await claimWebhookEvent(supabase, event);
    webhookRowId = claim.rowId;
    if (claim.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await syncCompletedCheckout(
          supabase,
          stripe,
          event.data.object as Stripe.Checkout.Session,
          event.id,
        );
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(
          supabase,
          event.data.object as Stripe.Subscription,
          event.id,
        );
        break;

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = stripeId(invoice.subscription);
        if (subscriptionId) {
          await syncSubscription(
            supabase,
            await stripe.subscriptions.retrieve(subscriptionId),
            event.id,
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = stripeId(invoice.subscription);
        if (!subscriptionId) {
          throw new Error("Stripe invoice has no subscription");
        }
        const owner = await requireVerifiedSubscriptionOwner(
          supabase,
          subscriptionId,
        );
        const { error } = await supabase
          .from("org_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscriptionId);
        if (error) throw error;
        await supabase.from("billing_audit_events").insert({
          org_id: owner.org_id,
          actor_user_id: owner.billing_contact_user_id,
          event_type: "invoice_payment_failed",
          outcome: "failed",
          stripe_event_id: event.id,
          details: {},
        });
        break;
      }
    }

    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processed",
        processing_result: "accepted",
        error_message: null,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", webhookRowId);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (webhookRowId) {
      await supabase
        .from("stripe_webhook_events")
        .update({
          status: "failed",
          error_message: message.slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", webhookRowId);
    }
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
