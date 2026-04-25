/**
 * Token Encryption/Decryption Utilities
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  
  // Ensure key is exactly 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, 'utf8');
  if (keyBuffer.length === 32) {
    return keyBuffer;
  }
  
  // Hash key to get exactly 32 bytes if not already
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a token using AES-256-GCM
 * @param {string} plaintext - Token to encrypt
 * @returns {string} Encrypted token in format: iv:authTag:ciphertext (base64)
 */
function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty token');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv, authTag, and ciphertext
  const encrypted = `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  return encrypted;
}

/**
 * Decrypt a token using AES-256-GCM
 * @param {string} encrypted - Encrypted token in format: iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext token
 */
function decrypt(encrypted) {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty token');
  }
  
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];
  
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }
  
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid authentication tag length');
  }
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

/**
 * Verify encryption key is properly configured
 * @returns {boolean}
 */
function verifyKey() {
  try {
    const key = getEncryptionKey();
    if (!key || key.length !== 32) {
      return false;
    }
    
    // Test encrypt/decrypt
    const test = 'test-verification';
    const encrypted = encrypt(test);
    const decrypted = decrypt(encrypted);
    return decrypted === test;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a new secure encryption key
 * @returns {string} Base64-encoded 32-byte key
 */
function generateKey() {
  return crypto.randomBytes(32).toString('base64');
}

module.exports = {
  encrypt,
  decrypt,
  verifyKey,
  generateKey
};
