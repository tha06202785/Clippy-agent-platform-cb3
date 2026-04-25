/**
 * Token Service
 * Manages encrypted token storage, retrieval, and auto-refresh
 */

const { Pool } = require('pg');
const cryptoUtils = require('./cryptoUtils');

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Token refresh buffer: 5 minutes in milliseconds
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Store a token in the database (encrypted)
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.service - Service name (facebook, google, fub)
 * @param {string} params.tokenType - Token type (access_token, refresh_token, api_key)
 * @param {string} params.token - Plain text token to encrypt
 * @param {Date} [params.expiresAt] - Token expiration time
 * @returns {Promise<Object>} Stored token record
 */
async function storeToken({ userId, service, tokenType, token, expiresAt }) {
  if (!userId || !service || !tokenType || !token) {
    throw new Error('Missing required parameters: userId, service, tokenType, token');
  }
  
  // Encrypt the token before storing
  const encryptedToken = cryptoUtils.encrypt(token);
  
  const query = `
    INSERT INTO encrypted_tokens (user_id, service, token_type, encrypted_token, expires_at, is_active)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (user_id, service, token_type)
    DO UPDATE SET
      encrypted_token = $4,
      expires_at = $5,
      is_active = true,
      updated_at = NOW()
    RETURNING id, user_id, service, token_type, expires_at, is_active, created_at, updated_at
  `;
  
  const values = [userId, service.toLowerCase(), tokenType.toLowerCase(), encryptedToken, expiresAt || null];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Retrieve and decrypt a token
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.service - Service name
 * @param {string} params.tokenType - Token type
 * @returns {Promise<Object|null>} Token with decrypted value or null
 */
async function getToken({ userId, service, tokenType }) {
  if (!userId || !service || !tokenType) {
    throw new Error('Missing required parameters: userId, service, tokenType');
  }
  
  const query = `
    SELECT id, user_id, service, token_type, encrypted_token, expires_at, is_active, created_at, updated_at
    FROM encrypted_tokens
    WHERE user_id = $1 AND service = $2 AND token_type = $3 AND is_active = true
  `;
  
  const result = await pool.query(query, [userId, service.toLowerCase(), tokenType.toLowerCase()]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const record = result.rows[0];
  
  try {
    const decryptedToken = cryptoUtils.decrypt(record.encrypted_token);
    return {
      ...record,
      token: decryptedToken
    };
  } catch (error) {
    throw new Error(`Failed to decrypt token: ${error.message}`);
  }
}

/**
 * Check if token needs refresh (expires within 5 minutes)
 * @param {Date} expiresAt - Token expiration time
 * @returns {boolean} True if token needs refresh
 */
function needsRefresh(expiresAt) {
  if (!expiresAt) {
    return false; // No expiration = no refresh needed
  }
  
  const expirationTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  
  return expirationTime - currentTime < REFRESH_BUFFER_MS;
}

/**
 * Get valid token, auto-refresh if needed
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.service - Service name
 * @param {string} params.tokenType - Token type
 * @param {Function} [params.refreshFn] - Optional refresh function
 * @returns {Promise<Object|null>} Valid token or null
 */
async function getValidToken({ userId, service, tokenType, refreshFn }) {
  const token = await getToken({ userId, service, tokenType });
  
  if (!token) {
    return null;
  }
  
  // Check if refresh is needed
  if (needsRefresh(token.expires_at)) {
    if (refreshFn && typeof refreshFn === 'function') {
      try {
        const refreshed = await refreshFn(token);
        if (refreshed) {
          // Store refreshed token
          await storeToken({
            userId,
            service,
            tokenType,
            token: refreshed.token,
            expiresAt: refreshed.expiresAt
          });
          return await getToken({ userId, service, tokenType });
        }
      } catch (error) {
        console.error(`Token refresh failed for ${service}/${tokenType}:`, error);
        // Return existing token even if expired - caller may handle
      }
    }
  }
  
  return token;
}

/**
 * Revoke/deactivate a token
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.service - Service name
 * @param {string} params.tokenType - Token type
 * @returns {Promise<boolean>} True if token was deactivated
 */
async function revokeToken({ userId, service, tokenType }) {
  const query = `
    UPDATE encrypted_tokens
    SET is_active = false, updated_at = NOW()
    WHERE user_id = $1 AND service = $2 AND token_type = $3
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId, service.toLowerCase(), tokenType.toLowerCase()]);
  return result.rows.length > 0;
}

/**
 * Revoke all tokens for a user
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Number of tokens revoked
 */
async function revokeAllUserTokens(userId) {
  const query = `
    UPDATE encrypted_tokens
    SET is_active = false, updated_at = NOW()
    WHERE user_id = $1
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rowCount;
}

/**
 * List all active tokens for a user (without decrypted values)
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} List of token metadata
 */
async function listUserTokens(userId) {
  const query = `
    SELECT id, service, token_type, expires_at, is_active, created_at, updated_at
    FROM encrypted_tokens
    WHERE user_id = $1 AND is_active = true
    ORDER BY service, token_type
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Update token expiration after refresh
 * @param {string} tokenId - Token UUID
 * @param {string} newEncryptedToken - New encrypted token
 * @param {Date} newExpiresAt - New expiration time
 * @returns {Promise<Object>} Updated token record
 */
async function updateTokenAfterRefresh(tokenId, newEncryptedToken, newExpiresAt) {
  const query = `
    UPDATE encrypted_tokens
    SET encrypted_token = $1, expires_at = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id, user_id, service, token_type, expires_at, is_active, updated_at
  `;
  
  const result = await pool.query(query, [newEncryptedToken, newExpiresAt, tokenId]);
  return result.rows[0];
}

/**
 * Delete all expired tokens older than specified days
 * @param {number} daysOld - Delete tokens expired more than this many days ago
 * @returns {Promise<number>} Number of tokens deleted
 */
async function cleanupExpiredTokens(daysOld = 30) {
  const query = `
    DELETE FROM encrypted_tokens
    WHERE expires_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING id
  `;
  
  const result = await pool.query(query);
  return result.rowCount;
}

module.exports = {
  storeToken,
  getToken,
  getValidToken,
  revokeToken,
  revokeAllUserTokens,
  listUserTokens,
  updateTokenAfterRefresh,
  needsRefresh,
  cleanupExpiredTokens
};
