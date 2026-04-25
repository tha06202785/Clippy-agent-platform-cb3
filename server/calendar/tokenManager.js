/**
 * Token Encryption and Management
 * Securely stores and retrieves Google OAuth tokens
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;

/**
 * Derive encryption key from environment variable
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
    if (!ENCRYPTION_KEY) {
        throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET must be set for token encryption');
    }
    
    // Use SHA-256 to derive fixed-length key
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a token
 * @param {string} token - Token to encrypt
 * @returns {string} Encrypted token (base64 encoded with IV and auth tag)
 */
function encryptToken(token) {
    if (!token) return null;
    
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Combine IV, authTag, and encrypted data
        const result = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'hex')
        ]);
        
        return result.toString('base64');
    } catch (error) {
        console.error('Token encryption failed:', error);
        throw new Error('Failed to encrypt token');
    }
}

/**
 * Decrypt a token
 * @param {string} encryptedToken - Encrypted token (base64)
 * @returns {string} Decrypted token
 */
function decryptToken(encryptedToken) {
    if (!encryptedToken) return null;
    
    try {
        const key = getEncryptionKey();
        const data = Buffer.from(encryptedToken, 'base64');
        
        // Extract IV, authTag, and encrypted data
        const iv = data.slice(0, IV_LENGTH);
        const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Token decryption failed:', error);
        throw new Error('Failed to decrypt token - token may be corrupted');
    }
}

/**
 * Check if a token is expired or about to expire
 * @param {Date|string} expiresAt - Token expiration time
 * @param {number} bufferMinutes - Buffer time before expiration (default: 5 min)
 * @returns {boolean} True if token needs refresh
 */
function isTokenExpired(expiresAt, bufferMinutes = 5) {
    if (!expiresAt) return true;
    
    const expiration = new Date(expiresAt);
    const buffer = bufferMinutes * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    
    return (expiration.getTime() - buffer) <= now;
}

/**
 * Calculate new expiration time for access token
 * Google access tokens typically last 3600 seconds (1 hour)
 * @returns {Date} New expiration time
 */
function calculateTokenExpiry() {
    return new Date(Date.now() + 3600 * 1000); // 1 hour from now
}

/**
 * Prepare tokens for storage (encrypt sensitive ones)
 * @param {Object} tokens - Token object from Google
 * @returns {Object} Tokens ready for database storage
 */
function prepareTokensForStorage(tokens) {
    return {
        access_token: tokens.access_token ? encryptToken(tokens.access_token) : null,
        refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : calculateTokenExpiry()
    };
}

/**
 * Prepare tokens for use (decrypt and format)
 * @param {Object} dbRecord - Database record with encrypted tokens
 * @returns {Object} Tokens ready for Google API use
 */
function prepareTokensForUse(dbRecord) {
    const tokens = {
        refresh_token: dbRecord.refresh_token ? decryptToken(dbRecord.refresh_token) : null
    };
    
    // Only include access token if present and not expired
    if (dbRecord.access_token && !isTokenExpired(dbRecord.token_expires_at)) {
        tokens.access_token = decryptToken(dbRecord.access_token);
    }
    
    return tokens;
}

/**
 * Extract user email from ID token
 * @param {string} idToken - JWT ID token from Google
 * @returns {string|null} User email
 */
function extractEmailFromIdToken(idToken) {
    if (!idToken) return null;
    
    try {
        // ID token is a JWT - split and decode payload
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.email || null;
    } catch (error) {
        console.error('Failed to parse ID token:', error);
        return null;
    }
}

module.exports = {
    encryptToken,
    decryptToken,
    isTokenExpired,
    calculateTokenExpiry,
    prepareTokensForStorage,
    prepareTokensForUse,
    extractEmailFromIdToken
};
