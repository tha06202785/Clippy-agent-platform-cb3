/**
 * Usage Middleware
 * Enforces subscription limits and tracks usage
 */

const { getPlan } = require('./stripeConfig');
const { supabase } = require('../auth/authMiddleware');

// Feature requirements by tier
const FEATURE_REQUIREMENTS = {
    'api_access': ['pro', 'enterprise'],
    'custom_branding': ['pro', 'enterprise'],
    'priority_support': ['pro', 'enterprise'],
    'advanced_analytics': ['pro', 'enterprise'],
    'bulk_operations': ['pro', 'enterprise'],
    'white_label': ['enterprise'],
    'dedicated_support': ['enterprise'],
    'custom_integrations': ['enterprise'],
};

// Default limits
const DEFAULT_LIMITS = {
    free: {
        leads: 50,
        ai_calls: 100,
        emails_sent: 500,
        storage_mb: 100,
    },
    pro: {
        leads: 500,
        ai_calls: -1, // unlimited
        emails_sent: 5000,
        storage_mb: 1000,
    },
    enterprise: {
        leads: -1, // unlimited
        ai_calls: -1, // unlimited
        emails_sent: -1, // unlimited
        storage_mb: -1, // unlimited
    }
};

/**
 * Middleware to enforce usage limits
 * Usage: enforceLimit('leads', { checkOnly: false })
 * 
 * @param {string} metric - The metric to check (leads, ai_calls, emails_sent, storage_mb)
 * @param {Object} options - Options for enforcement
 * @param {boolean} options.checkOnly - If true, only check and attach usage info to req, don't block
 * @param {number} options.amount - Amount to increment (default 1)
 * @returns {Function} Express middleware
 */
function enforceLimit(metric, options = {}) {
    const { checkOnly = false, amount = 1 } = options;

    return async (req, res, next) => {
        try {
            const userId = req.user?.user_id;

            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Get user's subscription tier and current usage
            const { canProceed, usage, limit, currentTier, error } = await checkAndTrackUsage(
                userId, 
                metric, 
                amount,
                { dryRun: checkOnly }
            );

            // Attach usage info to request
            req.usage = {
                metric,
                used: usage,
                limit,
                tier: currentTier,
                remaining: limit === -1 ? -1 : Math.max(0, limit - usage),
                percentage: limit === -1 ? 0 : Math.round((usage / limit) * 100)
            };

            if (!canProceed) {
                const plan = getPlan(currentTier);
                const upgradeUrl = '/subscription/upgrade';

                return res.status(429).json({
                    error: `Monthly ${metric} limit exceeded`,
                    code: 'USAGE_LIMIT_EXCEEDED',
                    currentTier,
                    limit,
                    usage,
                    upgrade: {
                        available: currentTier !== 'enterprise',
                        nextTier: currentTier === 'free' ? 'pro' : 'enterprise',
                        url: upgradeUrl
                    },
                    message: `You've reached your ${currentTier} plan limit of ${limit} ${metric} per month. Upgrade to unlock more.`
                });
            }

            // If approaching limit (80%+), add warning header
            if (req.usage.percentage >= 80 && limit !== -1) {
                res.set('X-Usage-Warning', `${metric}: ${req.usage.percentage}% of limit used`);
            }

            next();
        } catch (error) {
            console.error('Usage middleware error:', error);
            // In production, you might want to fail closed (block)
            // But for resilience, we'll log and allow
            console.warn('Usage check failed, allowing request');
            next();
        }
    };
}

/**
 * Check usage without incrementing (dry run)
 * Usage: checkUsage('leads')
 * 
 * @param {string} metric - The metric to check
 * @returns {Function} Express middleware
 */
function checkUsage(metric) {
    return enforceLimit(metric, { checkOnly: true });
}

/**
 * Track usage after successful operation
 * Usage: app.post('/api/leads', enforceLimit('leads'), createLead, trackUsage('leads'));
 * 
 * @param {string} metric - The metric to track
 * @param {number} amount - Amount to track (default 1)
 * @returns {Function} Express middleware
 */
function trackUsage(metric, amount = 1) {
    return async (req, res, next) => {
        // Don't track if response already sent with error
        if (res.headersSent) {
            return next();
        }

        try {
            const userId = req.user?.user_id;
            if (!userId) return next();

            await incrementUsage(userId, metric, amount);
            
            // Update req.usage if it exists
            if (req.usage) {
                req.usage.used += amount;
                req.usage.remaining = req.usage.limit === -1 ? -1 : Math.max(0, req.usage.limit - req.usage.used);
                req.usage.percentage = req.usage.limit === -1 ? 0 : Math.round((req.usage.used / req.usage.limit) * 100);
            }
        } catch (error) {
            console.error('Track usage error:', error);
        }

        next();
    };
}

/**
 * Middleware to require specific feature
 * Usage: requireFeature('api_access')
 * 
 * @param {string} feature - The feature required
 * @returns {Function} Express middleware
 */
function requireFeature(feature) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.user_id;

            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const { data: user } = await supabase
                .from('users')
                .select('subscription_tier')
                .eq('id', userId)
                .single();

            const tier = user?.subscription_tier || 'free';
            const allowedTiers = FEATURE_REQUIREMENTS[feature] || [];

            if (!allowedTiers.includes(tier)) {
                const plan = getPlan(tier);
                const requiredTier = allowedTiers[0];
                const requiredPlan = getPlan(requiredTier);

                return res.status(403).json({
                    error: `${feature} requires ${requiredPlan.name} plan`,
                    code: 'FEATURE_NOT_AVAILABLE',
                    feature,
                    currentTier: tier,
                    requiredTier,
                    upgradeUrl: '/subscription/upgrade'
                });
            }

            // Attach feature availability to request
            if (!req.features) req.features = {};
            req.features[feature] = true;

            next();
        } catch (error) {
            console.error('Feature check error:', error);
            res.status(500).json({
                error: 'Failed to check feature availability',
                code: 'FEATURE_CHECK_ERROR'
            });
        }
    };
}

/**
 * Middleware to require minimum tier
 * Usage: requireTier('pro')
 * 
 * @param {string} minTier - Minimum required tier
 * @returns {Function} Express middleware
 */
function requireTier(minTier) {
    const tierLevels = { free: 0, pro: 1, enterprise: 2 };
    const minLevel = tierLevels[minTier];

    return async (req, res, next) => {
        try {
            const userId = req.user?.user_id;

            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const { data: user } = await supabase
                .from('users')
                .select('subscription_tier')
                .eq('id', userId)
                .single();

            const currentTier = user?.subscription_tier || 'free';
            const currentLevel = tierLevels[currentTier];

            if (currentLevel < minLevel) {
                return res.status(403).json({
                    error: `This feature requires ${minTier} plan or higher`,
                    code: 'TIER_TOO_LOW',
                    currentTier,
                    requiredTier: minTier,
                    upgradeUrl: '/subscription/upgrade'
                });
            }

            next();
        } catch (error) {
            console.error('Tier check error:', error);
            res.status(500).json({
                error: 'Failed to check tier',
                code: 'TIER_CHECK_ERROR'
            });
        }
    };
}

/**
 * Check and optionally track usage
 * @param {string} userId - User ID
 * @param {string} metric - Metric to check
 * @param {number} amount - Amount to add
 * @param {Object} options - Options
 * @returns {Object} Result with canProceed, usage, limit, tier
 */
async function checkAndTrackUsage(userId, metric, amount = 1, options = {}) {
    const { dryRun = false } = options;

    try {
        // Get user's tier
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        const tier = user?.subscription_tier || 'free';
        const limits = DEFAULT_LIMITS[tier];
        const limit = limits[metric] || 0;

        // Unlimited
        if (limit === -1) {
            if (!dryRun) {
                await incrementUsage(userId, metric, amount);
            }
            return {
                canProceed: true,
                usage: 0,
                limit: -1,
                currentTier: tier
            };
        }

        // Get current usage for this billing period
        const { data: currentUsage } = await getCurrentUsage(userId, metric);
        const newUsage = currentUsage + amount;

        if (newUsage > limit) {
            return {
                canProceed: false,
                usage: currentUsage,
                limit,
                currentTier: tier,
                error: 'Limit exceeded'
            };
        }

        // Track usage if not dry run
        if (!dryRun) {
            await incrementUsage(userId, metric, amount);
        }

        return {
            canProceed: true,
            usage: currentUsage + (dryRun ? 0 : amount),
            limit,
            currentTier: tier
        };

    } catch (error) {
        console.error('Check and track usage error:', error);
        // Fail open in case of database errors
        return {
            canProceed: true,
            usage: 0,
            limit: -1,
            currentTier: 'unknown',
            error: error.message
        };
    }
}

/**
 * Get current usage for a metric
 * @param {string} userId - User ID
 * @param {string} metric - Metric name
 * @returns {number} Current usage count
 */
async function getCurrentUsage(userId, metric) {
    try {
        // Get current period from subscription
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('current_period_start, current_period_end')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let periodStart, periodEnd;

        if (subscription) {
            periodStart = subscription.current_period_start;
            periodEnd = subscription.current_period_end;
        } else {
            // Use calendar month for free tier
            const now = new Date();
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        }

        // Get usage for current period
        const { data: usage } = await supabase
            .from('usage_tracking')
            .select('count')
            .eq('user_id', userId)
            .eq('metric', metric)
            .gte('period_start', periodStart)
            .lte('period_end', periodEnd)
            .single();

        return usage?.count || 0;

    } catch (error) {
        console.error('Get current usage error:', error);
        return 0;
    }
}

/**
 * Increment usage counter
 * @param {string} userId - User ID
 * @param {string} metric - Metric name
 * @param {number} amount - Amount to increment
 */
async function incrementUsage(userId, metric, amount = 1) {
    try {
        // Get current period
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('current_period_start, current_period_end')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let periodStart, periodEnd;

        if (subscription) {
            periodStart = subscription.current_period_start;
            periodEnd = subscription.current_period_end;
        } else {
            // Use calendar month for free tier
            const now = new Date();
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        }

        // Upsert usage record
        const { data: existing } = await supabase
            .from('usage_tracking')
            .select('id, count')
            .eq('user_id', userId)
            .eq('metric', metric)
            .gte('period_start', periodStart)
            .lte('period_end', periodEnd)
            .single();

        if (existing) {
            // Update existing
            await supabase
                .from('usage_tracking')
                .update({
                    count: existing.count + amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            // Create new
            await supabase
                .from('usage_tracking')
                .insert({
                    user_id: userId,
                    metric,
                    count: amount,
                    period_start: periodStart,
                    period_end: periodEnd
                });
        }

    } catch (error) {
        console.error('Increment usage error:', error);
        throw error;
    }
}

/**
 * Get complete usage stats for a user
 * @param {string} userId - User ID
 * @returns {Object} Usage stats for all metrics
 */
async function getUserUsageStats(userId) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        const tier = user?.subscription_tier || 'free';
        const plan = getPlan(tier);
        const limits = plan.limits;

        const metrics = ['leads', 'ai_calls', 'emails_sent', 'storage_mb'];
        const stats = {};

        for (const metric of metrics) {
            const usage = await getCurrentUsage(userId, metric);
            const limit = limits[metric] || 0;

            stats[metric] = {
                used: usage,
                limit: limit,
                remaining: limit === -1 ? -1 : Math.max(0, limit - usage),
                percentage: limit === -1 ? 0 : Math.round((usage / limit) * 100),
                unlimited: limit === -1
            };
        }

        return {
            tier,
            stats,
            limits,
            hasWarnings: Object.values(stats).some(s => s.percentage >= 80 && !s.unlimited),
            hasExceeded: Object.values(stats).some(s => s.percentage >= 100 && !s.unlimited)
        };

    } catch (error) {
        console.error('Get user usage stats error:', error);
        throw error;
    }
}

module.exports = {
    enforceLimit,
    checkUsage,
    trackUsage,
    requireFeature,
    requireTier,
    checkAndTrackUsage,
    getCurrentUsage,
    incrementUsage,
    getUserUsageStats,
    FEATURE_REQUIREMENTS,
    DEFAULT_LIMITS
};