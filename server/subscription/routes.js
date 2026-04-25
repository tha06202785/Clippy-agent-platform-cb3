/**
 * Subscription Routes
 * API endpoints for subscription management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../auth/authMiddleware');
const { handleWebhook } = require('./webhookHandler');
const { 
    createCheckout,
    createBillingPortal,
    cancelUserSubscription,
    resumeUserSubscription,
    getSubscriptionStatus,
    getUsage,
    getBillingHistory,
    changeTier
} = require('./subscriptionController');
const { 
    enforceLimit,
    checkUsage,
    requireFeature,
    requireTier 
} = require('./usageMiddleware');

// ============================================
// WEBHOOK ENDPOINTS (No auth - Stripe calls these)
// ============================================

/**
 * @route   POST /webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe signature verification required)
 */
router.post('/stripe', 
    express.raw({ type: 'application/json' }), // Raw body needed for signature verification
    handleWebhook
);

// ============================================
// SUBSCRIPTION MANAGEMENT (Authenticated)
// ============================================

/**
 * @route   POST /api/subscription/create-checkout
 * @desc    Create Stripe Checkout session for subscription
 * @access  Private
 * @body    { tier: 'pro' | 'enterprise' }
 */
router.post('/create-checkout', 
    authenticateToken, 
    enforceLimit('leads', { checkOnly: true }), // Can check usage before payment
    createCheckout
);

/**
 * @route   POST /api/subscription/portal
 * @desc    Create Stripe Customer Portal session
 * @access  Private
 */
router.post('/portal', 
    authenticateToken, 
    createBillingPortal
);

/**
 * @route   POST /api/subscription/cancel
 * @desc    Cancel subscription (at period end or immediately)
 * @access  Private
 * @body    { immediate: boolean }
 */
router.post('/cancel', 
    authenticateToken, 
    cancelUserSubscription
);

/**
 * @route   POST /api/subscription/resume
 * @desc    Resume a subscription that was set to cancel
 * @access  Private
 */
router.post('/resume', 
    authenticateToken, 
    resumeUserSubscription
);

/**
 * @route   GET /api/subscription/status
 * @desc    Get current subscription status and plan details
 * @access  Private
 */
router.get('/status', 
    authenticateToken, 
    getSubscriptionStatus
);

/**
 * @route   GET /api/subscription/usage
 * @desc    Get current usage statistics
 * @access  Private
 */
router.get('/usage', 
    authenticateToken, 
    getUsage
);

/**
 * @route   GET /api/subscription/billing-history
 * @desc    Get billing/invoice history
 * @access  Private
 * @query   { limit: number, offset: number }
 */
router.get('/billing-history', 
    authenticateToken, 
    getBillingHistory
);

/**
 * @route   POST /api/subscription/change-tier
 * @desc    Change subscription tier (upgrade/downgrade)
 * @access  Private
 * @body    { tier: 'pro' | 'enterprise' }
 */
router.post('/change-tier', 
    authenticateToken, 
    changeTier
);

// ============================================
// USAGE-LIMITED ENDPOINTS (Example implementations)
// ============================================

/**
 * Example: Create lead (limited by plan)
 * @route   POST /api/leads
 * @desc    Create a new lead (enforces leads limit)
 * @access  Private
 */
router.post('/leads', 
    authenticateToken, 
    enforceLimit('leads'),
    (req, res) => {
        // Your actual lead creation logic would go here
        res.json({
            success: true,
            message: 'Lead created',
            usage: req.usage
        });
    }
);

/**
 * Example: AI call (limited by plan)
 * @route   POST /api/ai/generate
 * @desc    Make AI call (enforces ai_calls limit)
 * @access  Private
 */
router.post('/ai/generate', 
    authenticateToken, 
    enforceLimit('ai_calls'),
    (req, res) => {
        // Your actual AI generation logic would go here
        res.json({
            success: true,
            message: 'AI response generated',
            usage: req.usage
        });
    }
);

/**
 * Example: Send email (limited by plan)
 * @route   POST /api/emails/send
 * @desc    Send email (enforces emails_sent limit)
 * @access  Private
 */
router.post('/emails/send', 
    authenticateToken, 
    enforceLimit('emails_sent'),
    (req, res) => {
        // Your actual email sending logic would go here
        res.json({
            success: true,
            message: 'Email sent',
            usage: req.usage
        });
    }
);

// ============================================
// TIER-RESTRICTED ENDPOINTS (Example implementations)
// ============================================

/**
 * Example: API access (Pro+ only)
 * @route   POST /api/external/webhook
 * @desc    Receive external webhook (Pro+ only)
 * @access  Private (Pro+)
 */
router.post('/external/webhook', 
    authenticateToken, 
    requireFeature('api_access'),
    (req, res) => {
        res.json({
            success: true,
            message: 'Webhook received',
            tier: req.user?.subscription_tier
        });
    }
);

/**
 * Example: Custom branding (Pro+ only)
 * @route   GET /api/branding/custom
 * @desc    Get custom branding settings (Pro+ only)
 * @access  Private (Pro+)
 */
router.get('/branding/custom', 
    authenticateToken, 
    requireFeature('custom_branding'),
    (req, res) => {
        res.json({
            success: true,
            branding: {
                logo: 'custom_logo.png',
                colors: {
                    primary: '#your-brand-color',
                    secondary: '#your-secondary-color'
                }
            }
        });
    }
);

/**
 * Example: Priority support (Pro+ only)
 * @route   POST /api/support/priority
 * @desc    Create priority support ticket (Pro+ only)
 * @access  Private (Pro+)
 */
router.post('/support/priority', 
    authenticateToken, 
    requireFeature('priority_support'),
    (req, res) => {
        res.json({
            success: true,
            message: 'Priority support ticket created',
            ticketId: 'TKT-' + Date.now(),
            priority: 'high',
            responseTime: '4 hours'
        });
    }
);

/**
 * Example: Enterprise-only endpoint
 * @route   POST /api/admin/bulk-operation
 * @desc    Perform bulk operation (Enterprise only)
 * @access  Private (Enterprise)
 */
router.post('/admin/bulk-operation', 
    authenticateToken, 
    requireTier('enterprise'),
    (req, res) => {
        res.json({
            success: true,
            message: 'Bulk operation completed',
            tier: 'enterprise'
        });
    }
);

// ============================================
// DIAGNOSTIC ENDPOINTS (Development/Admin)
// ============================================

/**
 * @route   GET /api/subscription/debug/limits
 * @desc    Debug: See current limits and usage for authenticated user
 * @access  Private
 */
router.get('/debug/limits', 
    authenticateToken, 
    async (req, res) => {
        const { getUserUsageStats } = require('./usageMiddleware');
        
        try {
            const stats = await getUserUsageStats(req.user.user_id);
            res.json({
                user: req.user,
                ...stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get usage stats',
                details: error.message
            });
        }
    }
);

module.exports = router;