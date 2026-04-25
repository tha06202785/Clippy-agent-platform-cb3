/**
 * Facebook Service
 * Handles all Facebook Graph API interactions
 */

const { config, buildGraphUrl, getAppAccessToken } = require('./facebookConfig');

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} Token data
 */
async function exchangeCodeForToken(code) {
    const url = buildGraphUrl('/oauth/access_token', {
        client_id: config.appId,
        client_secret: config.appSecret,
        redirect_uri: config.oauth.redirectUri,
        code: code
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Token exchange failed: ${data.error.message}`);
    }
    
    return data;
}

/**
 * Exchange short-lived token for long-lived token
 * @param {string} shortLivedToken - Short-lived access token
 * @returns {Promise<string>} Long-lived access token
 */
async function exchangeForLongLivedToken(shortLivedToken) {
    const url = buildGraphUrl('/oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: shortLivedToken
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Token extension failed: ${data.error.message}`);
    }
    
    return data.access_token;
}

/**
 * Get user's Facebook Pages
 * @param {string} accessToken - User access token
 * @returns {Promise<Array>} List of pages
 */
async function getUserPages(accessToken) {
    const url = buildGraphUrl('/me/accounts', {
        access_token: accessToken,
        fields: 'id,name,access_token,category,instagram_business_account'
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to get pages: ${data.error.message}`);
    }
    
    return data.data || [];
}

/**
 * Get page details
 * @param {string} pageId - Page ID
 * @param {string} accessToken - Page access token
 * @returns {Promise<Object>} Page details
 */
async function getPageDetails(pageId, accessToken) {
    const url = buildGraphUrl(`/${pageId}`, {
        access_token: accessToken,
        fields: 'id,name,category,phone,emails,website,instagram_business_account'
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to get page details: ${data.error.message}`);
    }
    
    return data;
}

/**
 * Subscribe page to webhook
 * @param {string} pageId - Page ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<boolean>} Success status
 */
async function subscribePageToWebhook(pageId, pageAccessToken) {
    const url = buildGraphUrl(`/${pageId}/subscribed_apps`, {
        access_token: pageAccessToken,
        subscribed_fields: 'leadgen,messages,feed'
    });
    
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    
    if (data.error) {
        console.error('Webhook subscription error:', data.error);
        return false;
    }
    
    return data.success === true;
}

/**
 * Unsubscribe page from webhook
 * @param {string} pageId - Page ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<boolean>} Success status
 */
async function unsubscribePageFromWebhook(pageId, pageAccessToken) {
    const url = buildGraphUrl(`/${pageId}/subscribed_apps`, {
        access_token: pageAccessToken
    });
    
    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json();
    
    if (data.error) {
        console.error('Webhook unsubscription error:', data.error);
        return false;
    }
    
    return data.success === true;
}

/**
 * Fetch lead data from Facebook
 * @param {string} leadId - Facebook lead ID
 * @param {string} accessToken - Page access token
 * @returns {Promise<Object>} Lead data
 */
async function fetchLeadData(leadId, accessToken) {
    const url = buildGraphUrl(`/${leadId}`, {
        access_token: accessToken,
        fields: 'id,created_time,ad_id,form_id,campaign_id,field_data'
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to fetch lead: ${data.error.message}`);
    }
    
    // Parse field_data into a structured object
    const fieldData = {};
    if (data.field_data) {
        data.field_data.forEach(field => {
            fieldData[field.name] = field.values[0];
        });
    }
    
    return {
        facebook_lead_id: data.id,
        created_time: data.created_time,
        ad_id: data.ad_id,
        form_id: data.form_id,
        campaign_id: data.campaign_id,
        field_data: fieldData
    };
}

/**
 * Get form details
 * @param {string} formId - Form ID
 * @param {string} accessToken - Page access token
 * @returns {Promise<Object>} Form details
 */
async function getFormDetails(formId, accessToken) {
    const url = buildGraphUrl(`/${formId}`, {
        access_token: accessToken,
        fields: 'id,name,status'
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to get form details: ${data.error.message}`);
    }
    
    return data;
}

/**
 * Send Messenger message
 * @param {string} recipientId - Recipient PSID
 * @param {string} message - Message text
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<Object>} Message data
 */
async function sendMessengerMessage(recipientId, message, pageAccessToken) {
    const url = buildGraphUrl('/me/messages', {
        access_token: pageAccessToken
    });
    
    const body = {
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: 'RESPONSE'
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to send message: ${data.error.message}`);
    }
    
    return data;
}

/**
 * Get user profile from PSID
 * @param {string} psid - Page-scoped user ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<Object>} User profile
 */
async function getUserProfile(psid, pageAccessToken) {
    const url = buildGraphUrl(`/${psid}`, {
        access_token: pageAccessToken,
        fields: 'first_name,last_name,profile_pic'
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        console.warn('Failed to get user profile:', data.error.message);
        return null;
    }
    
    return data;
}

/**
 * Post to Facebook Page
 * @param {string} pageId - Page ID
 * @param {string} message - Post content
 * @param {Array<string>} mediaUrls - URLs of images/videos
 * @param {string} linkUrl - Link URL
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<Object>} Post data
 */
async function publishPost(pageId, message, mediaUrls = [], linkUrl = null, pageAccessToken) {
    let url;
    let body = {};
    
    if (mediaUrls && mediaUrls.length > 0) {
        // Photo post
        if (mediaUrls.length === 1) {
            // Single photo
            url = buildGraphUrl(`/${pageId}/photos`, {
                access_token: pageAccessToken,
                url: mediaUrls[0],
                caption: message
            });
        } else {
            // Multiple photos - requires separate upload first
            url = buildGraphUrl(`/${pageId}/feed`, {
                access_token: pageAccessToken,
                message: message
            });
        }
    } else if (linkUrl) {
        // Link post
        url = buildGraphUrl(`/${pageId}/feed`, {
            access_token: pageAccessToken,
            message: message,
            link: linkUrl
        });
    } else {
        // Text-only post
        url = buildGraphUrl(`/${pageId}/feed`, {
            access_token: pageAccessToken,
            message: message
        });
    }
    
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to publish post: ${data.error.message}`);
    }
    
    return {
        post_id: data.id,
        success: true
    };
}

/**
 * Delete Facebook post
 * @param {string} postId - Post ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<boolean>} Success status
 */
async function deletePost(postId, pageAccessToken) {
    const url = buildGraphUrl(`/${postId}`, {
        access_token: pageAccessToken
    });
    
    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Failed to delete post: ${data.error.message}`);
    }
    
    return data.success === true;
}

/**
 * Refresh page access token
 * Page access tokens don't expire but this validates they're still valid
 * @param {string} pageAccessToken - Current token
 * @returns {Promise<string>} Validated token (same or new)
 */
async function refreshPageToken(pageAccessToken) {
    const url = buildGraphUrl('/debug_token', {
        input_token: pageAccessToken,
        access_token: getAppAccessToken()
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Token validation failed: ${data.error.message}`);
    }
    
    const tokenInfo = data.data;
    
    if (!tokenInfo.is_valid) {
        throw new Error('Page access token is invalid');
    }
    
    if (tokenInfo.expires_at && tokenInfo.expires_at * 1000 < Date.now()) {
        throw new Error('Page access token has expired');
    }
    
    return pageAccessToken;
}

module.exports = {
    // OAuth & Token Management
    exchangeCodeForToken,
    exchangeForLongLivedToken,
    refreshPageToken,
    
    // Page Management
    getUserPages,
    getPageDetails,
    subscribePageToWebhook,
    unsubscribePageFromWebhook,
    
    // Lead Management
    fetchLeadData,
    getFormDetails,
    
    // Messaging
    sendMessengerMessage,
    getUserProfile,
    
    // Publishing
    publishPost,
    deletePost
};