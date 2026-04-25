/**
 * CRM Routes
 * API routes for CRM integration
 */

const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const {
    connectCRM,
    disconnectCRM,
    getCRMStatus,
    syncLead,
    getSyncLogs
} = require('./crmController');
const { handleWebhook } = require('./webhookHandler');

const router = express.Router();

// ============================================
// CRM Connection Routes
// ============================================

/**
 * @route POST /api/crm/connect
 * @desc Connect a CRM (FUB, Lofty, or Chime)
 * @access Private
 * @body {string} crmType - 'fub', 'lofty', or 'chime'
 * @body {string} apiKey - API key from CRM provider
 */
router.post('/connect', authenticateToken, connectCRM);

/**
 * @route POST /api/crm/disconnect
 * @desc Disconnect a CRM
 * @access Private
 * @body {string} crmType - CRM type to disconnect
 */
router.post('/disconnect', authenticateToken, disconnectCRM);

/**
 * @route GET /api/crm/status
 * @desc Get CRM connection status and sync stats
 * @access Private
 */
router.get('/status', authenticateToken, getCRMStatus);

// ============================================
// Sync Routes
// ============================================

/**
 * @route POST /api/crm/sync/:leadId
 * @desc Sync a specific lead to connected CRM(s)
 * @access Private
 */
router.post('/sync/:leadId', authenticateToken, syncLead);

/**
 * @route GET /api/crm/logs
 * @desc Get CRM sync logs
 * @access Private
 * @query {number} limit - Number of logs to return (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 * @query {string} crm_type - Filter by CRM type
 */
router.get('/logs', authenticateToken, getSyncLogs);

// ============================================
// Webhook Routes
// ============================================

/**
 * @route POST /webhooks/crm/:crmType
 * @desc Receive webhooks from CRM providers
 * @access Public (CRM providers call this)
 * @body Webhook payload from CRM
 * 
 * Webhooks handled:
 * - FUB: Contact updates, appointment changes
 * - Lofty: Lead updates, activity changes
 * - Chime: Contact updates, status changes
 */
router.post('/:crmType', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
