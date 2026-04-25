/**
 * Facebook Routes
 * API routes for Facebook integration
 */

const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const {
    startOAuth,
    handleOAuthCallback,
    getConnection,
    disconnectPage,
    updateSettings,
    getLeads,
    getLeadsStats,
    getConversation,
    sendReply,
    testAIResponse,
    createPost,
    getPosts,
    updatePostHandler,
    deletePostHandler,
    testLeadProcessing
} = require('./facebookController');
const { handleWebhookVerification, handleWebhookEvent, testWebhook } = require('./webhookHandler');

const router = express.Router();

// ============================================
// OAuth Routes
// ============================================

/**
 * @route GET /api/facebook/auth
 * @desc Start Facebook OAuth flow
 * @access Private
 */
router.get('/auth', authenticateToken, startOAuth);

/**
 * @route GET /api/facebook/callback
 * @desc Handle OAuth callback from Facebook
 * @access Public (Facebook calls this)
 */
router.get('/callback', handleOAuthCallback);

// ============================================
// Connection Routes
// ============================================

/**
 * @route GET /api/facebook/connection
 * @desc Get connected Facebook Page info
 * @access Private
 */
router.get('/connection', authenticateToken, getConnection);

/**
 * @route POST /api/facebook/disconnect
 * @desc Disconnect Facebook Page
 * @access Private
 */
router.post('/disconnect', authenticateToken, disconnectPage);

/**
 * @route PUT /api/facebook/settings
 * @desc Update connection settings (auto-reply, auto-post)
 * @access Private
 */
router.put('/settings', authenticateToken, updateSettings);

// ============================================
// Lead Routes
// ============================================

/**
 * @route GET /api/facebook/leads
 * @desc Get Facebook leads
 * @access Private
 */
router.get('/leads', authenticateToken, getLeads);

/**
 * @route GET /api/facebook/leads/stats
 * @desc Get lead statistics
 * @access Private
 */
router.get('/leads/stats', authenticateToken, getLeadsStats);

// ============================================
// Messaging Routes
// ============================================

/**
 * @route GET /api/facebook/conversations/:senderId
 * @desc Get conversation history with a user
 * @access Private
 */
router.get('/conversations/:senderId', authenticateToken, getConversation);

/**
 * @route POST /api/facebook/conversations/:senderId/reply
 * @desc Send manual reply to a conversation
 * @access Private
 */
router.post('/conversations/:senderId/reply', authenticateToken, sendReply);

/**
 * @route POST /api/facebook/test-ai
 * @desc Test AI response generation
 * @access Private
 */
router.post('/test-ai', authenticateToken, testAIResponse);

// ============================================
// Post Routes
// ============================================

/**
 * @route POST /api/facebook/posts
 * @desc Schedule or publish a post
 * @access Private
 */
router.post('/posts', authenticateToken, createPost);

/**
 * @route GET /api/facebook/posts
 * @desc Get user's scheduled/published posts
 * @access Private
 */
router.get('/posts', authenticateToken, getPosts);

/**
 * @route PUT /api/facebook/posts/:postId
 * @desc Update a scheduled post
 * @access Private
 */
router.put('/posts/:postId', authenticateToken, updatePostHandler);

/**
 * @route DELETE /api/facebook/posts/:postId
 * @desc Cancel/delete a post
 * @access Private
 */
router.delete('/posts/:postId', authenticateToken, deletePostHandler);

// ============================================
// Webhook Routes (Must use raw body parser)
// ============================================

/**
 * @route GET /webhooks/facebook
 * @desc Webhook verification (for Facebook setup)
 * @access Public
 */
router.get('/webhooks/facebook', handleWebhookVerification);

/**
 * @route POST /webhooks/facebook
 * @desc Receive webhook events from Facebook
 * @access Public (but signature verified)
 */
router.post('/webhooks/facebook', express.raw({ type: 'application/json' }), handleWebhookEvent);

// ============================================
// Testing Routes
// ============================================

/**
 * @route POST /api/facebook/test-webhook
 * @desc Test webhook processing (for development)
 * @access Private
 */
router.post('/test-webhook', authenticateToken, testWebhook);

/**
 * @route POST /api/facebook/test-lead
 * @desc Manually trigger lead processing (for testing)
 * @access Private
 */
router.post('/test-lead', authenticateToken, testLeadProcessing);

module.exports = router;