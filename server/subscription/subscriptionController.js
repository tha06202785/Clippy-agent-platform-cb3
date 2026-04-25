/**
 * Subscription Controller
 * Handles subscription lifecycle: checkout, portal, cancel, status
 */

const { 
    stripe, 
    getPlan, 
    getPlanByPriceId,
    createCheckoutSession, 
    createPortalSession,
    cancelSubscription,
    resumeSubscription,
    getSubscription,
    getOrCreateCustomer,
    formatAmount,
    PRICES,
    PLANS 
} = require('./stripeConfig');
const { supabase } = require('../auth/authMiddleware');

// Frontend URLs
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Create Stripe Checkout session
 * POST /api/subscription/create-checkout
 */
async function createCheckout(req, res) {
    try {
        const { tier = 'pro' } = req.body;
        const userId = req.user.user_id;
        const userEmail = req.user.email;

        // Validate tier
        const plan = getPlan(tier);
        if (!plan || tier === 'free') {
            return res.status(400).json({
                error: 'Invalid tier. Choose "pro" or "enterprise"',
                code: 'INVALID_TIER'
            });
        }

        // Check if user already has an active subscription
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (existingSub && existingSub.tier === tier) {
            return res.status(400).json({
                error: `You already have an active ${tier} subscription`,
                code: 'ALREADY_SUBSCRIBED'
            });
        }

        // Get or create Stripe customer
        let stripeCustomerId = existingSub?.stripe_customer_id;
        
        try {
            const customer = await getOrCreateCustomer(userId, userEmail, stripeCustomerId);
            stripeCustomerId = customer.id;
        } catch (error) {
            console.error('Error creating customer:', error);
            return res.status(500).json({
                error: 'Failed to create customer',
                code: 'CUSTOMER_ERROR'
            });
        }

        // Create checkout session
        const session = await createCheckoutSession({
            customerId: stripeCustomerId,
            priceId: plan.priceId,
            userId: userId,
            successUrl: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${FRONTEND_URL}/subscription/cancel`,
            metadata: {
                tier: tier,
            }
        });

        // Update user's stripe_customer_id if not set
        if (!existingSub?.stripe_customer_id) {
            await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    stripe_customer_id: stripeCustomerId,
                    tier: 'free', // Start as free until checkout completes
                    status: 'incomplete',
                }, {
                    onConflict: 'user_id'
                });
        }

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url,
            tier: tier,
            price: plan.price
        });

    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            code: 'CHECKOUT_ERROR',
            details: error.message
        });
    }
}

/**
 * Create Stripe Customer Portal session
 * POST /api/subscription/portal
 */
async function createBillingPortal(req, res) {
    try {
        const userId = req.user.user_id;

        // Get user's Stripe customer ID
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!subscription?.stripe_customer_id) {
            return res.status(400).json({
                error: 'No billing account found. Subscribe to a plan first.',
                code: 'NO_CUSTOMER'
            });
        }

        // Create portal session
        const portalSession = await createPortalSession(
            subscription.stripe_customer_id,
            `${FRONTEND_URL}/subscription/billing`
        );

        res.json({
            success: true,
            url: portalSession.url
        });

    } catch (error) {
        console.error('Portal error:', error);
        res.status(500).json({
            error: 'Failed to create billing portal',
            code: 'PORTAL_ERROR',
            details: error.message
        });
    }
}

/**
 * Cancel subscription
 * POST /api/subscription/cancel
 */
async function cancelUserSubscription(req, res) {
    try {
        const userId = req.user.user_id;
        const { immediate = false } = req.body;

        // Get active subscription
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!subscription) {
            return res.status(404).json({
                error: 'No active subscription found',
                code: 'NO_SUBSCRIPTION'
            });
        }

        // If free tier, nothing to cancel
        if (subscription.tier === 'free') {
            return res.status(400).json({
                error: 'Cannot cancel free tier subscription',
                code: 'FREE_TIER'
            });
        }

        // Cancel in Stripe
        if (subscription.stripe_subscription_id) {
            if (immediate) {
                // Cancel immediately
                await stripe.subscriptions.del(subscription.stripe_subscription_id);
                
                // Update local record
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        cancel_at_period_end: false,
                        ended_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subscription.id);
                
                // Update user's tier
                await supabase
                    .from('users')
                    .update({ subscription_tier: 'free' })
                    .eq('id', userId);

                return res.json({
                    success: true,
                    message: 'Subscription cancelled immediately',
                    immediate: true
                });
            } else {
                // Cancel at period end
                await cancelSubscription(subscription.stripe_subscription_id);
                
                // Update local record
                await supabase
                    .from('subscriptions')
                    .update({
                        cancel_at_period_end: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subscription.id);

                return res.json({
                    success: true,
                    message: 'Subscription will cancel at end of billing period',
                    cancelAt: subscription.current_period_end,
                    immediate: false
                });
            }
        }

        res.status(500).json({
            error: 'No Stripe subscription found',
            code: 'STRIPE_ERROR'
        });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            code: 'CANCEL_ERROR',
            details: error.message
        });
    }
}

/**
 * Resume (uncancel) subscription
 * POST /api/subscription/resume
 */
async function resumeUserSubscription(req, res) {
    try {
        const userId = req.user.user_id;

        // Get subscription with cancel_at_period_end = true
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .eq('cancel_at_period_end', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!subscription) {
            return res.status(404).json({
                error: 'No cancellable subscription found',
                code: 'NO_SUBSCRIPTION'
            });
        }

        // Resume in Stripe
        if (subscription.stripe_subscription_id) {
            await resumeSubscription(subscription.stripe_subscription_id);
            
            // Update local record
            await supabase
                .from('subscriptions')
                .update({
                    cancel_at_period_end: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id);

            return res.json({
                success: true,
                message: 'Subscription resumed'
            });
        }

        res.status(500).json({
            error: 'No Stripe subscription found',
            code: 'STRIPE_ERROR'
        });

    } catch (error) {
        console.error('Resume subscription error:', error);
        res.status(500).json({
            error: 'Failed to resume subscription',
            code: 'RESUME_ERROR',
            details: error.message
        });
    }
}

/**
 * Get user's subscription status
 * GET /api/subscription/status
 */
async function getSubscriptionStatus(req, res) {
    try {
        const userId = req.user.user_id;

        // Get active subscription
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Get user's tier from users table
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier, email')
            .eq('id', userId)
            .single();

        const currentTier = user?.subscription_tier || 'free';
        const plan = getPlan(currentTier);

        // Build response
        const response = {
            tier: currentTier,
            plan: {
                name: plan.name,
                price: plan.price,
                description: plan.description,
                features: plan.features,
                limits: plan.limits
            },
            subscription: subscription ? {
                status: subscription.status,
                tier: subscription.tier,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                canceledAt: subscription.canceled_at,
                createdAt: subscription.created_at,
                updatedAt: subscription.updated_at
            } : null,
            availableTiers: Object.values(PLANS).map(p => ({
                tier: p.tier,
                name: p.name,
                price: p.price,
                description: p.description,
                features: p.features
            }))
        };

        res.json(response);

    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({
            error: 'Failed to get subscription status',
            code: 'STATUS_ERROR'
        });
    }
}

/**
 * Get user's usage stats
 * GET /api/subscription/usage
 */
async function getUsage(req, res) {
    try {
        const userId = req.user.user_id;

        // Get user's tier and limits
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        const tier = user?.subscription_tier || 'free';
        const plan = getPlan(tier);

        // Get current usage
        const { data: usageData } = await supabase
            .from('usage_tracking')
            .select('*')
            .eq('user_id', userId)
            .lte('period_start', new Date().toISOString())
            .gte('period_end', new Date().toISOString());

        // Build usage response
        const metrics = ['leads', 'ai_calls', 'emails_sent', 'storage_mb'];
        const usage = {};
        const limits = {};
        const percentages = {};

        metrics.forEach(metric => {
            const used = usageData?.find(u => u.metric === metric)?.count || 0;
            const limit = plan.limits[metric] || 0;
            const percentage = limit === -1 ? 0 : (limit > 0 ? Math.round((used / limit) * 100) : 0);
            
            usage[metric] = used;
            limits[metric] = limit;
            percentages[metric] = percentage;
        });

        // Calculate warnings
        const warnings = [];
        metrics.forEach(metric => {
            if (limits[metric] !== -1 && percentages[metric] >= 80) {
                warnings.push({
                    metric,
                    percentage: percentages[metric],
                    severity: percentages[metric] >= 100 ? 'critical' : 'warning'
                });
            }
        });

        res.json({
            tier,
            period: {
                start: usageData?.[0]?.period_start || new Date().toISOString(),
                end: usageData?.[0]?.period_end || new Date().toISOString()
            },
            usage,
            limits,
            percentages,
            warnings,
            isUnlimited: tier === 'enterprise'
        });

    } catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({
            error: 'Failed to get usage stats',
            code: 'USAGE_ERROR'
        });
    }
}

/**
 * Get billing history
 * GET /api/subscription/billing-history
 */
async function getBillingHistory(req, res) {
    try {
        const userId = req.user.user_id;
        const { limit = 10, offset = 0 } = req.query;

        const { data: history, error, count } = await supabase
            .from('billing_history')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw error;
        }

        // Format amounts
        const formattedHistory = history.map(item => ({
            ...item,
            amountFormatted: formatAmount(item.amount, item.currency),
            date: item.created_at
        }));

        res.json({
            history: formattedHistory,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Get billing history error:', error);
        res.status(500).json({
            error: 'Failed to get billing history',
            code: 'BILLING_HISTORY_ERROR'
        });
    }
}

/**
 * Change subscription tier (upgrade/downgrade)
 * POST /api/subscription/change-tier
 */
async function changeTier(req, res) {
    try {
        const { tier: newTier } = req.body;
        const userId = req.user.user_id;

        if (!newTier || !['free', 'pro', 'enterprise'].includes(newTier)) {
            return res.status(400).json({
                error: 'Invalid tier specified',
                code: 'INVALID_TIER'
            });
        }

        // Get current subscription
        const { data: currentSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const currentTier = currentSub?.tier || 'free';

        // Can't downgrade to free via this endpoint
        if (newTier === 'free') {
            return res.status(400).json({
                error: 'Use cancel subscription to downgrade to free',
                code: 'USE_CANCEL'
            });
        }

        // If upgrading
        if (newTier === 'pro' && currentTier === 'free') {
            // Redirect to checkout
            return res.json({
                action: 'checkout_required',
                message: 'Please complete checkout to upgrade',
                checkoutEndpoint: '/api/subscription/create-checkout',
                tier: newTier
            });
        }

        // If changing between paid tiers
        if (currentSub?.stripe_subscription_id && newTier !== currentTier) {
            const newPlan = getPlan(newTier);
            const oldPlan = getPlan(currentTier);

            if (!newPlan.priceId) {
                return res.status(400).json({
                    error: 'New tier not configured',
                    code: 'TIER_NOT_CONFIGURED'
                });
            }

            // Update subscription in Stripe
            try {
                const updatedSubscription = await stripe.subscriptions.update(
                    currentSub.stripe_subscription_id,
                    {
                        items: [{
                            id: (await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)).items.data[0].id,
                            price: newPlan.priceId,
                        }],
                        proration_behavior: 'create_prorations',
                    }
                );

                // Update local record
                await supabase
                    .from('subscriptions')
                    .update({
                        tier: newTier,
                        stripe_price_id: newPlan.priceId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentSub.id);

                // Update user's tier
                await supabase
                    .from('users')
                    .update({ subscription_tier: newTier })
                    .eq('id', userId);

                return res.json({
                    success: true,
                    message: `Upgraded from ${oldPlan.name} to ${newPlan.name}`,
                    tier: newTier,
                    prorationDate: updatedSubscription.current_period_end
                });

            } catch (stripeError) {
                console.error('Stripe update error:', stripeError);
                return res.status(500).json({
                    error: 'Failed to update subscription in Stripe',
                    code: 'STRIPE_UPDATE_ERROR',
                    details: stripeError.message
                });
            }
        }

        res.json({
            success: false,
            message: 'No changes needed',
            currentTier,
            requestedTier: newTier
        });

    } catch (error) {
        console.error('Change tier error:', error);
        res.status(500).json({
            error: 'Failed to change tier',
            code: 'TIER_CHANGE_ERROR',
            details: error.message
        });
    }
}

module.exports = {
    createCheckout,
    createBillingPortal,
    cancelUserSubscription,
    resumeUserSubscription,
    getSubscriptionStatus,
    getUsage,
    getBillingHistory,
    changeTier
};