/**
 * Stripe Webhook Handler
 * Handles all Stripe webhook events for subscriptions
 */

const { 
    stripe, 
    constructWebhookEvent, 
    getPlanByPriceId,
    SUBSCRIPTION_STATUS,
    WEBHOOK_EVENTS 
} = require('./stripeConfig');
const { supabase } = require('../auth/authMiddleware');

/**
 * Main webhook handler
 * POST /webhooks/stripe
 */
async function handleWebhook(req, res) {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        // Verify webhook signature
        event = constructWebhookEvent(payload, sig);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`🎣 Webhook received: ${event.type} (${event.id})`);

    // Log webhook event for debugging/replay
    try {
        await supabase
            .from('webhook_events')
            .upsert({
                stripe_event_id: event.id,
                event_type: event.type,
                payload: event.data.object,
                processed: false,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'stripe_event_id'
            });
    } catch (logError) {
        console.warn('Failed to log webhook event:', logError.message);
        // Continue processing even if logging fails
    }

    try {
        // Process the event
        await processWebhookEvent(event);

        // Mark as processed
        await supabase
            .from('webhook_events')
            .update({
                processed: true,
                processed_at: new Date().toISOString()
            })
            .eq('stripe_event_id', event.id);

        res.json({ received: true, event: event.type });

    } catch (error) {
        console.error('Webhook processing error:', error);
        
        // Mark as failed with error
        await supabase
            .from('webhook_events')
            .update({
                error_message: error.message,
                processed: false
            })
            .eq('stripe_event_id', event.id);

        // Return 200 to prevent Stripe from retrying indefinitely
        // Log the error for manual review
        res.status(200).json({ 
            received: true, 
            event: event.type,
            processed: false,
            error: 'Processing failed - logged for review'
        });
    }
}

/**
 * Process individual webhook event
 */
async function processWebhookEvent(event) {
    const handlers = {
        // Checkout events
        [WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED]: handleCheckoutSessionCompleted,
        [WEBHOOK_EVENTS.CHECKOUT_SESSION_EXPIRED]: handleCheckoutSessionExpired,
        
        // Subscription events
        [WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED]: handleSubscriptionCreated,
        [WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED]: handleSubscriptionUpdated,
        [WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED]: handleSubscriptionDeleted,
        
        // Invoice events
        [WEBHOOK_EVENTS.INVOICE_PAID]: handleInvoicePaid,
        [WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED]: handleInvoicePaymentSucceeded,
        [WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED]: handleInvoicePaymentFailed,
        
        // Payment events
        [WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED]: handlePaymentIntentSucceeded,
        [WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED]: handlePaymentIntentFailed,
    };

    const handler = handlers[event.type];
    
    if (handler) {
        await handler(event.data.object);
    } else {
        console.log(`No handler for event type: ${event.type}`);
    }
}

/**
 * Handle checkout.session.completed
 * User completed checkout and subscribed
 */
async function handleCheckoutSessionCompleted(session) {
    console.log('Processing checkout.session.completed:', session.id);

    const userId = session.metadata?.user_id;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const tier = session.metadata?.tier || 'pro';

    if (!userId) {
        console.error('No user_id in session metadata');
        return;
    }

    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = stripeSubscription.items.data[0].price.id;

    // Update or create subscription in database
    const { data: existingSub, error: fetchError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

    const subscriptionData = {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        status: stripeSubscription.status,
        tier: tier,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
    };

    if (existingSub) {
        // Update existing
        const { error } = await supabase
            .from('subscriptions')
            .update(subscriptionData)
            .eq('id', existingSub.id);

        if (error) {
            console.error('Error updating subscription:', error);
            throw error;
        }
    } else {
        // Create new
        const { error } = await supabase
            .from('subscriptions')
            .insert(subscriptionData);

        if (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }

    // Update user's tier in users table
    const { error: userError } = await supabase
        .from('users')
        .update({ 
            subscription_tier: tier,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (userError) {
        console.error('Error updating user tier:', userError);
    }

    console.log(`✅ Subscription activated for user ${userId}: ${tier}`);
}

/**
 * Handle checkout.session.expired
 * User abandoned checkout
 */
async function handleCheckoutSessionExpired(session) {
    console.log('Checkout session expired:', session.id);
    // Could send email to user about abandoned cart
    // For now, just log
}

/**
 * Handle customer.subscription.created
 * New subscription created in Stripe
 */
async function handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);
    // Usually handled by checkout.session.completed, but handle here too
    await syncSubscriptionFromStripe(subscription);
}

/**
 * Handle customer.subscription.updated
 * Subscription was modified (tier change, status change, etc)
 */
async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);
    await syncSubscriptionFromStripe(subscription);
}

/**
 * Handle customer.subscription.deleted
 * Subscription was cancelled and ended
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

    if (sub) {
        // Update subscription status
        await supabase
            .from('subscriptions')
            .update({
                status: 'canceled',
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);

        // Downgrade user to free
        await supabase
            .from('users')
            .update({ 
                subscription_tier: 'free',
                updated_at: new Date().toISOString()
            })
            .eq('id', sub.user_id);

        console.log(`✅ User ${sub.user_id} downgraded to free`);
    }
}

/**
 * Sync subscription data from Stripe
 */
async function syncSubscriptionFromStripe(subscription) {
    const customerId = subscription.customer;
    
    // Find user by customer ID
    const { data: userSub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!userSub) {
        console.warn('No user found for customer:', customerId);
        return;
    }

    const userId = userSub.user_id;
    const priceId = subscription.items.data[0]?.price.id;
    const tier = subscription.metadata?.tier || 
                 (priceId ? getPlanByPriceId(priceId).tier : 'pro');

    // Update subscription
    await supabase
        .from('subscriptions')
        .update({
            stripe_price_id: priceId,
            status: subscription.status,
            tier: tier,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

    // Update user tier if active
    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
        await supabase
            .from('users')
            .update({ 
                subscription_tier: tier,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
    }

    console.log(`✅ Subscription synced: ${subscription.id} -> ${tier}`);
}

/**
 * Handle invoice.paid
 * Invoice was paid
 */
async function handleInvoicePaid(invoice) {
    await syncInvoice(invoice);
}

/**
 * Handle invoice.payment_succeeded
 * Payment succeeded for invoice
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log('Invoice payment succeeded:', invoice.id);
    await syncInvoice(invoice);
    
    // If subscription was past_due, it might be active now
    if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await syncSubscriptionFromStripe(subscription);
    }
}

/**
 * Handle invoice.payment_failed
 * Payment failed for invoice
 */
async function handleInvoicePaymentFailed(invoice) {
    console.log('Invoice payment failed:', invoice.id);
    
    // Sync invoice with failed status
    await syncInvoice(invoice, 'failed');

    // Get user for notification
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id, stripe_subscription_id')
        .eq('stripe_customer_id', invoice.customer)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (sub) {
        // Update subscription status
        await supabase
            .from('subscriptions')
            .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', sub.stripe_subscription_id);

        console.log(`⚠️ Payment failed for user ${sub.user_id}`);
        
        // TODO: Send email notification to user
        // await sendPaymentFailedEmail(sub.user_id, invoice);
    }
}

/**
 * Sync invoice to billing_history
 */
async function syncInvoice(invoice, overrideStatus = null) {
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', invoice.customer)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!sub) {
        console.warn('No subscription found for customer:', invoice.customer);
        return;
    }

    const invoiceData = {
        user_id: sub.user_id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: overrideStatus || invoice.status,
        description: invoice.description || 'Subscription payment',
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        created_at: new Date(invoice.created * 1000).toISOString()
    };

    await supabase
        .from('billing_history')
        .upsert(invoiceData, {
            onConflict: 'stripe_invoice_id'
        });

    console.log(`✅ Invoice synced: ${invoice.id}`);
}

/**
 * Handle payment_intent.succeeded
 * Direct payment succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    console.log('Payment intent succeeded:', paymentIntent.id);
    // Usually handled by invoice events for subscriptions
}

/**
 * Handle payment_intent.payment_failed
 * Direct payment failed
 */
async function handlePaymentIntentFailed(paymentIntent) {
    console.log('Payment intent failed:', paymentIntent.id);
    
    // Get user for notification
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', paymentIntent.customer)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (sub) {
        console.log(`⚠️ Payment failed for user ${sub.user_id}: ${paymentIntent.last_payment_error?.message}`);
        // TODO: Send email notification
    }
}

/**
 * Manual sync - resync all subscriptions from Stripe
 * Useful for initial setup or recovery
 */
async function syncAllSubscriptions() {
    console.log('Starting manual sync of all subscriptions...');
    
    // Get all active subscriptions from database
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .not('stripe_subscription_id', 'is', null);

    for (const sub of subs || []) {
        try {
            const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
            await syncSubscriptionFromStripe(stripeSub);
        } catch (error) {
            console.error(`Failed to sync ${sub.stripe_subscription_id}:`, error.message);
        }
    }

    console.log('Manual sync complete');
}

module.exports = {
    handleWebhook,
    syncAllSubscriptions
};