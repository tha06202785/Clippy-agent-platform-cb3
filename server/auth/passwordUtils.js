const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to hash password');
    }
}

/**
 * Compare a plaintext password with a hash
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if match
 */
async function comparePassword(password, hash) {
    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    } catch (error) {
        console.error('Error comparing password:', error);
        throw new Error('Failed to compare password');
    }
}

/**
 * Generate a cryptographically secure random token
 * @param {number} length - Token length (default 32)
 * @returns {string} - Hex token
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a password reset token with expiration
 * @returns {Object} - Token and expiration date
 */
function generatePasswordResetToken() {
    const token = generateToken(32);
    // Expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return { token, expiresAt };
}

/**
 * Generate email verification token
 * @returns {Object} - Token and expiration date
 */
function generateEmailVerificationToken() {
    const token = generateToken(32);
    // Expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return { token, expiresAt };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
function validatePasswordStrength(password) {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    
    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUppercase) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowercase) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
        errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChars) {
        errors.push('Password must contain at least one special character');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    generatePasswordResetToken,
    generateEmailVerificationToken,
    validatePasswordStrength
};
