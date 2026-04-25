/**
 * Google Calendar API Configuration
 * Handles OAuth2 client setup and API scopes
 */

const { google } = require('googleapis');

// OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://api.useclippy.com/auth/google/callback';

// Required OAuth scopes for calendar access
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',      // Full calendar access
    'https://www.googleapis.com/auth/calendar.events', // Event management
    'https://www.googleapis.com/auth/userinfo.email'   // Get user's email
];

/**
 * Create OAuth2 client
 * @returns {OAuth2Client} Google OAuth2 client
 */
function createOAuth2Client() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error('Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    }

    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );
}

/**
 * Create OAuth2 client with tokens
 * @param {Object} tokens - Access and refresh tokens
 * @returns {OAuth2Client} Configured OAuth2 client
 */
function createOAuth2ClientWithTokens(tokens) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
}

/**
 * Generate OAuth authorization URL
 * @param {string} state - State parameter for security
 * @returns {string} Authorization URL
 */
function getAuthUrl(state) {
    const oauth2Client = createOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',           // Get refresh token
        scope: GOOGLE_SCOPES,
        include_granted_scopes: true,     // Include previously granted scopes
        prompt: 'consent',                // Force consent screen to get refresh token
        state: state                      // CSRF protection
    });

    return authUrl;
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 * @returns {Promise<Object>} Tokens object
 */
async function exchangeCodeForTokens(code) {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

/**
 * Create Calendar API client
 * @param {OAuth2Client} authClient - Authenticated OAuth2 client
 * @returns {calendar_v3.Calendar} Google Calendar API client
 */
function createCalendarClient(authClient) {
    return google.calendar({ version: 'v3', auth: authClient });
}

/**
 * Validate configuration
 * @returns {Object} Validation result
 */
function validateConfig() {
    const missing = [];
    
    if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
    if (!GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
    if (!GOOGLE_REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI');
    
    if (missing.length > 0) {
        return {
            valid: false,
            error: `Missing required environment variables: ${missing.join(', ')}`
        };
    }
    
    return {
        valid: true,
        redirectUri: GOOGLE_REDIRECT_URI,
        scopes: GOOGLE_SCOPES
    };
}

module.exports = {
    GOOGLE_SCOPES,
    GOOGLE_REDIRECT_URI,
    createOAuth2Client,
    createOAuth2ClientWithTokens,
    getAuthUrl,
    exchangeCodeForTokens,
    createCalendarClient,
    validateConfig
};
