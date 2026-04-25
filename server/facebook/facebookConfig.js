/**
 * Facebook Configuration
 * Centralized configuration for Facebook API integration
 */

const crypto = require('crypto');

// Environment configuration
const config = {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    webhookVerifyToken: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
    apiVersion: process.env.FACEBOOK_API_VERSION || 'v18.0',
    graphApiBase: `https://graph.facebook.com/${process.env.FACEBOOK_API_VERSION || 'v18.0'}`,
    webhookUrl: process.env.FACEBOOK_WEBHOOK_URL || 'https://api.useclippy.com/webhooks/facebook',
    
    // OAuth settings
    oauth: {
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'https://api.useclippy.com/api/facebook/callback',
        scopes: [
            'pages_manage_metadata',
            'pages_read_engagement',
            'pages_messaging',
            'pages_manage_posts',
            'leads_retrieval',
            'business_management'
        ]
    }
};

/**
 * Validate configuration
 * @throws {Error} If required config is missing
 */
function validateConfig() {
    const required = ['appId', 'appSecret', 'webhookVerifyToken'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required Facebook config: ${missing.join(', ')}`);
    }
    
    console.log('✓ Facebook configuration validated');
}

/**
 * Generate app access token
 * @returns {string} App access token
 */
function getAppAccessToken() {
    return `${config.appId}|${config.appSecret}`;
}

/**
 * Generate signature for webhook verification
 * @param {string} body - Request body
 * @returns {string} SHA256 signature
 */
function generateSignature(body) {
    return crypto
        .createHmac('sha256', config.appSecret)
        .update(body, 'utf8')
        .digest('hex');
}

/**
 * Verify webhook signature
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} body - Raw request body
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(signature, body) {
    if (!signature) return false;
    
    // Remove 'sha256=' prefix if present
    const sig = signature.startsWith('sha256=') 
        ? signature.slice(7) 
        : signature;
    
    const expectedSig = generateSignature(body);
    
    try {
        return crypto.timingSafeEqual(
            Buffer.from(sig, 'hex'),
            Buffer.from(expectedSig, 'hex')
        );
    } catch (e) {
        return false;
    }
}

/**
 * Get Facebook OAuth URL
 * @param {string} state - OAuth state parameter
 * @returns {string} Authorization URL
 */
function getOAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: config.appId,
        redirect_uri: config.oauth.redirectUri,
        scope: config.oauth.scopes.join(','),
        state: state,
        response_type: 'code'
    });
    
    return `https://www.facebook.com/${config.apiVersion}/dialog/oauth?${params.toString()}`;
}

/**
 * Build Graph API URL
 * @param {string} path - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {string} Full URL
 */
function buildGraphUrl(path, params = {}) {
    const queryString = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    
    const separator = queryString ? '?' : '';
    return `${config.graphApiBase}${path}${separator}${queryString}`;
}

module.exports = {
    config,
    validateConfig,
    getAppAccessToken,
    generateSignature,
    verifyWebhookSignature,
    getOAuthUrl,
    buildGraphUrl
};