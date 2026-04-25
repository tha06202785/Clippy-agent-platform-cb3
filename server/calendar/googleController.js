/**
 * Google OAuth Controller
 * Handles OAuth flow, token management, and account connection
 */

const crypto = require('crypto');
const { 
    getAuthUrl, 
    exchangeCodeForTokens, 
    validateConfig 
} = require('./googleConfig');
const { 
    encryptToken, 
    prepareTokensForStorage, 
    extractEmailFromIdToken 
} = require('./tokenManager');
const { supabase } = require('../auth/authMiddleware');

// State tokens for CSRF protection (in-memory for now, use Redis in production)
const stateTokens = new Map();

/**
 * Validate state token
 * @param {string} state - State from callback
 * @returns {boolean} Valid state
 */
function validateStateToken(state) {
    const data = stateTokens.get(state);
    if (!data) return false;
    
    // Check expiration (10 minutes)
    if (Date.now() - data.created > 10 * 60 * 1000) {
        stateTokens.delete(state);
        return false;
    }
    
    return true;
}

/**
 * Initiate Google OAuth flow
 * GET /api/google/auth
 */
async function initiateOAuth(req, res) {
    try {
        // Check if already connected
        const { data: existing } = await supabase
            .from('google_connections')
            .select('id')
            .eq('user_id', req.user.user_id)
            .single();

        if (existing) {
            return res.status(400).json({
                error: 'Google account already connected',
                code: 'ALREADY_CONNECTED'
            });
        }

        // Generate CSRF state token
        const state = crypto.randomBytes(32).toString('hex');
        stateTokens.set(state, {
            userId: req.user.user_id,
            created: Date.now()
        });

        // Generate authorization URL
        const authUrl = getAuthUrl(state);

        res.json({
            success: true,
            authUrl,
            state
        });
    } catch (error) {
        console.error('OAuth initiation failed:', error);
        res.status(500).json({
            error: 'Failed to initiate OAuth',
            code: 'OAUTH_INIT_FAILED',
            message: error.message
        });
    }
}

/**
 * Handle OAuth callback
 * GET /api/google/callback
 */
async function handleOAuthCallback(req, res) {
    const { code, state, error: oauthError } = req.query;

    try {
        // Check for OAuth errors
        if (oauthError) {
            throw new Error(`OAuth error: ${oauthError}`);
        }

        // Validate state token
        if (!state || !validateStateToken(state)) {
            throw new Error('Invalid or expired state token');
        }

        const stateData = stateTokens.get(state);
        stateTokens.delete(state); // Clean up

        if (!code) {
            throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Extract user email from ID token
        const email = extractEmailFromIdToken(tokens.id_token);

        // Prepare tokens for storage
        const tokensForStorage = prepareTokensForStorage(tokens);

        // Store in database
        const { error: insertError } = await supabase
            .from('google_connections')
            .insert({
                user_id: stateData.userId,
                google_email: email,
                refresh_token: tokensForStorage.refresh_token,
                access_token: tokensForStorage.access_token,
                token_expires_at: tokensForStorage.token_expires_at,
                calendar_sync_enabled: true
            });

        if (insertError) {
            throw new Error(`Database error: ${insertError.message}`);
        }

        // Redirect to frontend success page
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/calendar?connected=true`;
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('OAuth callback failed:', error);
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/calendar?error=${encodeURIComponent(error.message)}`;
        res.redirect(redirectUrl);
    }
}

/**
 * Disconnect Google account
 * POST /api/google/disconnect
 */
async function disconnectAccount(req, res) {
    try {
        // Get connection to check existence
        const { data: connection, error: fetchError } = await supabase
            .from('google_connections')
            .select('id, refresh_token')
            .eq('user_id', req.user.user_id)
            .single();

        if (fetchError || !connection) {
            return res.status(404).json({
                error: 'Google account not connected',
                code: 'NOT_CONNECTED'
            });
        }

        // Revoke token with Google (optional but good practice)
        try {
            const { createOAuth2Client } = require('./googleConfig');
            const { decryptToken } = require('./tokenManager');
            
            const oauth2Client = createOAuth2Client();
            const refreshToken = decryptToken(connection.refresh_token);
            
            if (refreshToken) {
                await oauth2Client.revokeToken(refreshToken);
            }
        } catch (revokeError) {
            console.warn('Token revocation failed (non-critical):', revokeError.message);
        }

        // Remove from database
        const { error: deleteError } = await supabase
            .from('google_connections')
            .delete()
            .eq('user_id', req.user.user_id);

        if (deleteError) {
            throw new Error(`Database error: ${deleteError.message}`);
        }

        res.json({
            success: true,
            message: 'Google account disconnected successfully'
        });
    } catch (error) {
        console.error('Disconnect failed:', error);
        res.status(500).json({
            error: 'Failed to disconnect Google account',
            code: 'DISCONNECT_FAILED',
            message: error.message
        });
    }
}

/**
 * Get connection status
 * GET /api/google/status
 */
async function getConnectionStatus(req, res) {
    try {
        const { data: connection, error } = await supabase
            .from('google_connections')
            .select('id, google_email, calendar_sync_enabled, created_at, updated_at')
            .eq('user_id', req.user.user_id)
            .single();

        if (error || !connection) {
            return res.json({
                connected: false
            });
        }

        res.json({
            connected: true,
            email: connection.google_email,
            syncEnabled: connection.calendar_sync_enabled,
            connectedAt: connection.created_at,
            lastUpdated: connection.updated_at
        });
    } catch (error) {
        console.error('Status check failed:', error);
        res.status(500).json({
            error: 'Failed to check connection status',
            code: 'STATUS_CHECK_FAILED'
        });
    }
}

/**
 * Toggle calendar sync
 * PUT /api/google/sync
 */
async function toggleSync(req, res) {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                error: 'enabled must be a boolean',
                code: 'INVALID_PARAMS'
            });
        }

        const { error } = await supabase
            .from('google_connections')
            .update({ calendar_sync_enabled: enabled })
            .eq('user_id', req.user.user_id);

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        res.json({
            success: true,
            syncEnabled: enabled
        });
    } catch (error) {
        console.error('Toggle sync failed:', error);
        res.status(500).json({
            error: 'Failed to toggle sync',
            code: 'TOGGLE_SYNC_FAILED'
        });
    }
}

/**
 * Refresh access token manually
 * POST /api/google/refresh
 */
async function refreshToken(req, res) {
    try {
        const { data: connection, error } = await supabase
            .from('google_connections')
            .select('refresh_token')
            .eq('user_id', req.user.user_id)
            .single();

        if (error || !connection) {
            return res.status(404).json({
                error: 'Google account not connected',
                code: 'NOT_CONNECTED'
            });
        }

        // Import required modules
        const { decryptToken, encryptToken, calculateTokenExpiry } = require('./tokenManager');
        const { createOAuth2ClientWithTokens } = require('./googleConfig');

        const refreshToken = decryptToken(connection.refresh_token);
        
        // Create OAuth client with refresh token
        const oauth2Client = createOAuth2ClientWithTokens({ refresh_token: refreshToken });
        
        // Refresh access token
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update database
        await supabase
            .from('google_connections')
            .update({
                access_token: credentials.access_token ? encryptToken(credentials.access_token) : null,
                token_expires_at: calculateTokenExpiry(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', req.user.user_id);

        res.json({
            success: true,
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        console.error('Token refresh failed:', error);
        res.status(500).json({
            error: 'Failed to refresh token',
            code: 'REFRESH_FAILED',
            message: error.message
        });
    }
}

module.exports = {
    initiateOAuth,
    handleOAuthCallback,
    disconnectAccount,
    getConnectionStatus,
    toggleSync,
    refreshToken
};
