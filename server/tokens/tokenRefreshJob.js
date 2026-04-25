/**
 * Token Refresh Job
 * Background job for refreshing tokens before they expire
 * Supports Facebook, Google, and FUB token refresh
 */

const { Pool } = require('pg');
const cryptoUtils = require('./cryptoUtils');

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Refresh window: tokens expiring within next 10 minutes
const REFRESH_WINDOW_MINUTES = 10;

/**
 * Token Refresh Strategies for different services
 */
const refreshStrategies = {
  /**
   * Facebook Page Access Token Refresh
   * Uses Facebook's token exchange/refresh endpoint
   */
  facebook: async (tokenRecord) => {
    const decryptedToken = cryptoUtils.decrypt(tokenRecord.encrypted_token);
    
    // Facebook Long-lived token exchange
    // https://developers.facebook.com/docs/pages/access-tokens
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
      `fb_exchange_token=${decryptedToken}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook refresh failed: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    
    return {
      token: data.access_token,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : null
    };
  },
  
  /**
   * Google OAuth Token Refresh
   * Uses refresh token to get new access token
   */
  google: async (tokenRecord) => {
    // Get the refresh token
    const refreshQuery = `
      SELECT encrypted_token FROM encrypted_tokens
      WHERE user_id = $1 AND service = 'google' AND token_type = 'refresh_token' AND is_active = true
    `;
    const refreshResult = await pool.query(refreshQuery, [tokenRecord.user_id]);
    
    if (refreshResult.rows.length === 0) {
      throw new Error('No refresh token found for Google');
    }
    
    const refreshToken = cryptoUtils.decrypt(refreshResult.rows[0].encrypted_token);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google refresh failed: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    
    return {
      token: data.access_token,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 3600 * 1000) // Default 1 hour
    };
  },
  
  /**
   * FUB (Follow Up Boss) API Key Refresh
   * FUB uses persistent API keys, no refresh needed
   * This validates the key is still active
   */
  fub: async (tokenRecord) => {
    const decryptedToken = cryptoUtils.decrypt(tokenRecord.encrypted_token);
    
    // Validate the API key by making a test request
    const response = await fetch('https://api.followupboss.com/v1/users', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${decryptedToken}:`).toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`FUB API key validation failed: ${response.status}`);
    }
    
    // FUB API keys don't expire, just return same token
    return {
      token: decryptedToken,
      expiresAt: null
    };
  }
};

/**
 * Find tokens that need refresh
 * @returns {Promise<Array>} Tokens expiring soon
 */
async function findTokensNeedingRefresh() {
  const query = `
    SELECT id, user_id, service, token_type, encrypted_token, expires_at
    FROM encrypted_tokens
    WHERE is_active = true
      AND expires_at IS NOT NULL
      AND expires_at <= NOW() + INTERVAL '${REFRESH_WINDOW_MINUTES} minutes'
      AND service IN ('facebook', 'google', 'fub')
    ORDER BY expires_at ASC
    LIMIT 100
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Refresh a single token
 * @param {Object} tokenRecord - Token database record
 * @returns {Promise<Object>} Refresh result
 */
async function refreshToken(tokenRecord) {
  const strategy = refreshStrategies[tokenRecord.service];
  
  if (!strategy) {
    throw new Error(`No refresh strategy for service: ${tokenRecord.service}`);
  }
  
  console.log(`Refreshing ${tokenRecord.service} ${tokenRecord.token_type} for user ${tokenRecord.user_id}`);
  
  try {
    const refreshed = await strategy(tokenRecord);
    
    // Encrypt and store new token
    const newEncryptedToken = cryptoUtils.encrypt(refreshed.token);
    
    const updateQuery = `
      UPDATE encrypted_tokens
      SET encrypted_token = $1, expires_at = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, service, token_type, expires_at
    `;
    
    const result = await pool.query(updateQuery, [
      newEncryptedToken,
      refreshed.expiresAt,
      tokenRecord.id
    ]);
    
    console.log(`Successfully refreshed token: ${result.rows[0].id}`);
    
    return {
      success: true,
      token: result.rows[0],
      expiresAt: refreshed.expiresAt
    };
    
  } catch (error) {
    console.error(`Failed to refresh token ${tokenRecord.id}:`, error.message);
    
    // Deactivate token if refresh failed (token may be revoked)
    if (error.message.includes('invalid') || error.message.includes('expired')) {
      await deactivateToken(tokenRecord.id);
    }
    
    return {
      success: false,
      error: error.message,
      tokenId: tokenRecord.id
    };
  }
}

/**
 * Deactivate a token
 * @param {string} tokenId - Token UUID
 */
async function deactivateToken(tokenId) {
  const query = `
    UPDATE encrypted_tokens
    SET is_active = false, updated_at = NOW()
    WHERE id = $1
  `;
  await pool.query(query, [tokenId]);
  console.log(`Deactivated token ${tokenId}`);
}

/**
 * Run the refresh job
 * Finds and refreshes all tokens expiring soon
 * @returns {Promise<Object>} Job results
 */
async function runRefreshJob() {
  console.log(`[${new Date().toISOString()}] Starting token refresh job...`);
  
  const results = {
    checked: 0,
    refreshed: 0,
    failed: 0,
    deactivated: 0,
    errors: []
  };
  
  try {
    const tokens = await findTokensNeedingRefresh();
    results.checked = tokens.length;
    
    console.log(`Found ${tokens.length} tokens needing refresh`);
    
    for (const token of tokens) {
      const result = await refreshToken(token);
      
      if (result.success) {
        results.refreshed++;
      } else {
        results.failed++;
        results.errors.push({
          tokenId: token.id,
          service: token.service,
          error: result.error
        });
        
        if (result.deactivated) {
          results.deactivated++;
        }
      }
    }
    
  } catch (error) {
    console.error('Token refresh job failed:', error);
    results.errors.push({ error: error.message });
  }
  
  console.log(`[${new Date().toISOString()}] Token refresh job complete:`, results);
  return results;
}

/**
 * Schedule periodic refresh job
 * @param {number} intervalMinutes - How often to run the job
 */
function scheduleRefreshJob(intervalMinutes = 5) {
  console.log(`Scheduling token refresh job every ${intervalMinutes} minutes`);
  
  // Run immediately on startup
  runRefreshJob();
  
  // Schedule recurring runs
  setInterval(runRefreshJob, intervalMinutes * 60 * 1000);
  
  return {
    intervalMinutes,
    nextRun: new Date(Date.now() + intervalMinutes * 60 * 1000)
  };
}

/**
 * Manual refresh for a specific user's token
 * @param {string} userId - User UUID
 * @param {string} service - Service name
 * @param {string} tokenType - Token type
 */
async function manualRefresh(userId, service, tokenType) {
  const query = `
    SELECT * FROM encrypted_tokens
    WHERE user_id = $1 AND service = $2 AND token_type = $3 AND is_active = true
  `;
  
  const result = await pool.query(query, [userId, service, tokenType]);
  
  if (result.rows.length === 0) {
    throw new Error('Token not found');
  }
  
  return await refreshToken(result.rows[0]);
}

module.exports = {
  runRefreshJob,
  scheduleRefreshJob,
  manualRefresh,
  refreshToken,
  findTokensNeedingRefresh
};
