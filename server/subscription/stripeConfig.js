/**
 * Stripe Configuration
 * Centralized Stripe client setup and price configuration
 */

const Stripe = require('stripe');

// Validate environment variables
const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'PRICE_PRO',
    'PRICE_ENTERPRISE'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.warn('⚠️  Missing Stripe environment variables:', missingVars.join(', '));
    console.warn('Some subscription features may not work correctly');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16', // Use a stable API version
    timeout: 30000, // 30 second timeout
    maxNetworkRetries: 3, // Retry failed requests
});

// Price IDs from environment (create these in Stripe Dashboard first)
const PRICES = {
    FREE: process.env.PRICE_FREE || null, // Free plan - no Stripe price needed
    PRO: process.env.PRICE_PRO,
    ENTERPRISE: process.env.PRICE_ENTERPRISE,
};

// Plan configuration with limits
const PLANS = {
    free: {
        tier: 'free',
        name: 'Free',
        price: 0,
        priceId: null,
        description: 'Free tier with basic features',
        features: [
            '50 leads per month',
            '100 AI calls per month',
            'Basic features',
            'Email support'
        ],
        limits: {
            leads: 50,
            ai_calls: 100,
            emails_sent: 500,
            storage_mb: 100,
            priority_support: false,
            custom_branding: false,
            api_access: false
        }
    },
    pro: {
        tier: 'pro',
        name: 'Pro',
        price: 29,
        priceId: PRICES.PRO,
        description: 'Professional tier for power users',
        features: [
            '500 leads per month',
            'Unlimited AI calls',
            'All features',
            'Priority support',
            'Custom branding',
            'API access'
        ],
        limits: {
            leads: 500,
            ai_calls: -1, // unlimited
            emails_sent: 5000,
            storage_mb: 1000,
            priority_support: true,
            custom_branding: true,
            api_access: true
        }
    },
    enterprise: {
        tier: 'enterprise',
        name: 'Enterprise',
        price: 'custom',
        priceId: PRICES.ENTERPRISE,
        description: 'Enterprise tier with custom limits',
        features: [
            'Unlimited leads',
            'Unlimited AI calls',
            'All features',
            'Dedicated support',
            'Custom branding',
            'API access',
            'SLA guarantee',
            'Custom integrations'
        ],
        limits: {
            leads: -1, // unlimited
            ai_calls: -1, // unlimited
            emails_sent: -1, // unlimited
            storage_mb: -1, // unlimited
            priority_support: true,
            custom_branding: true,
            api_access: true
        }
    }
};

// Webhook event types we handle
const WEBHOOK_EVENTS = {
    // Checkout events
    CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
    CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired',
    
    // Subscription events
    CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
    CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
    CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
    
    // Invoice events
    INVOICE_CREATED: 'invoice.created',
    INVOICE_FINALIZED: 'invoice.finalized',
    INVOICE_PAID: 'invoice.paid',
    INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
    INVOICE_UPCOMING: 'invoice.upcoming',
    INVOICE_MARKED_UNCOLLECTIBLE: 'invoice.marked_uncollectible',
    
    // Payment events
    PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
    PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
    
    // Customer events
    CUSTOMER_CREATED: 'customer.created',
    CUSTOMER_UPDATED: 'customer.updated',
    CUSTOMER_DELETED: 'customer.deleted',
};

// Subscription status mapping
const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
    INCOMPLETE: 'incomplete',
    INCOMPLETE_EXPIRED: 'incomplete_expired',
    UNPAID: 'unpaid',
    PAUSED: 'paused',
    TRIALING: 'trialing',
};

/**
 * Get plan by tier
 * @param {string} tier - free, pro, or enterprise
 * @returns {Object} Plan configuration
 */
function getPlan(tier) {
    return PLANS[tier] || PLANS.free;
}

/**
 * Get plan by Stripe price ID
 * @param {string} priceId - Stripe price ID
 * @returns {Object} Plan configuration
 */
function getPlanByPriceId(priceId) {
    if (priceId === PRICES.PRO) return PLANS.pro;
    if (priceId === PRICES.ENTERPRISE) return PLANS.enterprise;
    return PLANS.free;
}

/**
 * Validate webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe-Signature header
 * @returns {Object} Webhook event
 */
function constructWebhookEvent(payload, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }
    
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Create Stripe customer for user
 * @param {string} email - User email
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Stripe customer
 */
async function createCustomer(email, metadata = {}) {
    return await stripe.customers.create({
        email,
        metadata: {
            ...metadata,
            created_by: 'clippy_api',
            created_at: new Date().toISOString(),
        },
    });
}

/**
 * Get or create Stripe customer
 * @param {string} userId - Internal user ID
 * @param {string} email - User email
 * @param {string} existingCustomerId - Existing Stripe customer ID if known
 * @returns {Promise<Object>} Stripe customer
 */
async function getOrCreateCustomer(userId, email, existingCustomerId = null) {
    // If we have an existing customer ID, try to retrieve it
    if (existingCustomerId) {
        try {
            const customer = await stripe.customers.retrieve(existingCustomerId);
            if (!customer.deleted) {
                return customer;
            }
        } catch (error) {
            console.log('Existing customer not found, creating new one:', error.message);
        }
    }
    
    // Create new customer
    return await createCustomer(email, {
        user_id: userId,
    });
}

/**
 * Create checkout session for subscription
 * @param {Object} params - Checkout parameters
 * @returns {Promise<Object>} Checkout session
 */
async function createCheckoutSession({
    customerId,
    priceId,
    userId,
    successUrl,
    cancelUrl,
    metadata = {}
}) {
    const plan = getPlanByPriceId(priceId);
    
    const sessionConfig = {
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
            price: priceId,
            quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            user_id: userId,
            tier: plan.tier,
            ...metadata,
        },
        subscription_data: {
            metadata: {
                user_id: userId,
                tier: plan.tier,
            },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
    };
    
    // For enterprise/custom pricing, use setup mode instead
    if (plan.tier === 'enterprise') {
        sessionConfig.mode = 'setup';
        delete sessionConfig.line_items;
        sessionConfig.setup_intent_data = {
            metadata: {
                user_id: userId,
                tier: 'enterprise',
            },
        };
    }
    
    return await stripe.checkout.sessions.create(sessionConfig);
}

/**
 * Create customer portal session
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - URL to return to after portal
 * @returns {Promise<Object>} Portal session
 */
async function createPortalSession(customerId, returnUrl) {
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}

/**
 * Cancel subscription at period end
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Updated subscription
 */
async function cancelSubscription(subscriptionId) {
    return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
    });
}

/**
 * Resume subscription (uncancel)
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Updated subscription
 */
async function resumeSubscription(subscriptionId) {
    return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
    });
}

/**
 * Update subscription to new price
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newPriceId - New Stripe price ID
 * @returns {Promise<Object>} Updated subscription
 */
async function updateSubscriptionPrice(subscriptionId, newPriceId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update the first item with the new price
    const itemId = subscription.items.data[0].id;
    
    return await stripe.subscriptions.update(subscriptionId, {
        items: [{
            id: itemId,
            price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
    });
}

/**
 * Get subscription details
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Subscription details
 */
async function getSubscription(subscriptionId) {
    return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Check if price ID is valid
 * @param {string} priceId - Price ID to validate
 * @returns {Promise<boolean>} True if valid
 */
async function isValidPriceId(priceId) {
    if (!priceId) return false;
    
    // Check if it's one of our configured prices
    if (priceId === PRICES.PRO || priceId === PRICES.ENTERPRISE) {
        return true;
    }
    
    // Otherwise, validate with Stripe
    try {
        await stripe.prices.retrieve(priceId);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Format amount from cents to currency string
 * @param {number} amountInCents - Amount in cents
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
function formatAmount(amountInCents, currency = 'usd') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
}

module.exports = {
    stripe,
    PRICES,
    PLANS,
    WEBHOOK_EVENTS,
    SUBSCRIPTION_STATUS,
    getPlan,
    getPlanByPriceId,
    constructWebhookEvent,
    createCustomer,
    getOrCreateCustomer,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
    resumeSubscription,
    updateSubscriptionPrice,
    getSubscription,
    isValidPriceId,
    formatAmount,
};