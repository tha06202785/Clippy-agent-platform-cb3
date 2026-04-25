/**
 * Facebook Controller
 * Handles OAuth flow and connection management
 */

const crypto = require('crypto');
const { 
    exchangeCodeForToken, 
    exchangeForLongLivedToken,
    getUserPages,
    getPageDetails,
    subscribePageToWebhook,
    unsubscribePageFromWebhook
} = require('./facebookService');
const { config, getOAuthUrl } = require('./facebookConfig');
const { supabase } = require('../auth/authMiddleware');
const { processLead, getRecentLeads, getLeadStats } = require('./leadProcessor');
const { getConversationHistory, sendManualReply, generateAIResponse } = require('./autoReplyService');
const { schedulePost, getUserPosts, cancelPost, updatePost } = require('./postScheduler');

/**
 * Start OAuth flow
 * GET /api/facebook/auth
 */
async function startOAuth(req, res) {
    try {
        // Generate state parameter with user ID encoded
        const stateData = {
            user_id: req.user.user_id,
            timestamp: Date.now(),
            nonce: crypto.randomBytes(16).toString('hex')
        };
        
        const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
        
        // Store state temporarily (or use signed cookies)
        await supabase
            .from('oauth_states')
            .insert({
                state: state,
                user_id: req.user.user_id,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
            });
        
        const authUrl = getOAuthUrl(state);
        
        res.json({
            success: true,
            auth_url: authUrl,
            state: state
        });
    } catch (error) {
        console.error('OAuth start error:', error);
        res.status(500).json({
            error: 'Failed to start OAuth flow',
            code: 'OAUTH_START_ERROR'
        });
    }
}

/**
 * Handle OAuth callback
 * GET /api/facebook/callback
 */
async function handleOAuthCallback(req, res) {
    const { code, state, error: fbError } = req.query;
    
    if (fbError) {
        console.error('Facebook OAuth error:', fbError);
        return res.redirect(`${process.env.FRONTEND_URL}/facebook/error?error=${encodeURIComponent(fbError)}`);
    }
    
    if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL}/facebook/error?error=missing_params`);
    }
    
    try {
        // Verify state
        const { data: storedState } = await supabase
            .from('oauth_states')
            .select('user_id')
            .eq('state', state)
            .gt('expires_at', new Date().toISOString())
            .single();
        
        if (!storedState) {
            throw new Error('Invalid or expired state');
        }
        
        const userId = storedState.user_id;
        
        // Exchange code for token
        const tokenData = await exchangeCodeForToken(code);
        
        if (!tokenData.access_token) {
            throw new Error('No access token received');
        }
        
        // Exchange for long-lived token
        const longLivedToken = await exchangeForLongLivedToken(tokenData.access_token);
        
        // Get user's pages
        const pages = await getUserPages(longLivedToken);
        
        if (pages.length === 0) {
            return res.redirect(`${process.env.FRONTEND_URL}/facebook/error?error=no_pages`);
        }
        
        // Connect the first page (could show page picker UI instead)
        const page = pages[0];
        
        // Subscribe page to webhook
        await subscribePageToWebhook(page.id, page.access_token);
        
        // Get page details
        const pageDetails = await getPageDetails(page.id, page.access_token);
        
        // Store connection
        const { error: insertError } = await supabase
            .from('facebook_connections')
            .upsert({
                user_id: userId,
                page_id: page.id,
                page_name: page.name,
                page_access_token: page.access_token,
                instagram_account_id: pageDetails.instagram_business_account?.id || null,
                webhook_subscribed: true,
                auto_reply_enabled: true,
                auto_post_enabled: false,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,page_id'
            });
        
        if (insertError) {
            throw new Error(`Failed to store connection: ${insertError.message}`);
        }
        
        // Clean up state
        await supabase
            .from('oauth_states')
            .delete()
            .eq('state', state);
        
        // Redirect to success page
        res.redirect(`${process.env.FRONTEND_URL}/facebook/connected?` +
            `page_name=${encodeURIComponent(page.name)}` +
            `&page_id=${page.id}`
        );
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/facebook/error?error=${encodeURIComponent(error.message)}`);
    }
}

/**
 * Get connected page info
 * GET /api/facebook/connection
 */
async function getConnection(req, res) {
    try {
        const { data: connection, error } = await supabase
            .from('facebook_connections')
            .select('*')
            .eq('user_id', req.user.user_id)
            .single();
        
        if (error || !connection) {
            return res.json({
                connected: false,
                message: 'No Facebook Page connected'
            });
        }
        
        // Don't expose tokens in response
        res.json({
            connected: true,
            page: {
                id: connection.page_id,
                name: connection.page_name,
                instagram_account_id: connection.instagram_account_id,
                webhook_subscribed: connection.webhook_subscribed,
                auto_reply_enabled: connection.auto_reply_enabled,
                auto_post_enabled: connection.auto_post_enabled,
                created_at: connection.created_at
            }
        });
    } catch (error) {
        console.error('Get connection error:', error);
        res.status(500).json({
            error: 'Failed to get connection',
            code: 'GET_CONNECTION_ERROR'
        });
    }
}

/**
 * Disconnect Facebook Page
 * POST /api/facebook/disconnect
 */
async function disconnectPage(req, res) {
    try {
        const { data: connection, error } = await supabase
            .from('facebook_connections')
            .select('*')
            .eq('user_id', req.user.user_id)
            .single();
        
        if (error || !connection) {
            return res.status(404).json({
                error: 'No connection found',
                code: 'NO_CONNECTION'
            });
        }
        
        // Unsubscribe from webhook
        try {
            await unsubscribePageFromWebhook(connection.page_id, connection.page_access_token);
        } catch (e) {
            console.warn('Failed to unsubscribe webhook:', e.message);
        }
        
        // Delete connection
        const { error: deleteError } = await supabase
            .from('facebook_connections')
            .delete()
            .eq('user_id', req.user.user_id);
        
        if (deleteError) {
            throw new Error(`Failed to delete connection: ${deleteError.message}`);
        }
        
        res.json({
            success: true,
            message: 'Facebook Page disconnected'
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            error: 'Failed to disconnect',
            code: 'DISCONNECT_ERROR'
        });
    }
}

/**
 * Update connection settings
 * PUT /api/facebook/settings
 */
async function updateSettings(req, res) {
    try {
        const { auto_reply_enabled, auto_post_enabled } = req.body;
        
        const updates = {};
        if (auto_reply_enabled !== undefined) {
            updates.auto_reply_enabled = auto_reply_enabled;
        }
        if (auto_post_enabled !== undefined) {
            updates.auto_post_enabled = auto_post_enabled;
        }
        
        const { data: connection, error } = await supabase
            .from('facebook_connections')
            .update(updates)
            .eq('user_id', req.user.user_id)
            .select()
            .single();
        
        if (error) {
            throw new Error(`Failed to update settings: ${error.message}`);
        }
        
        res.json({
            success: true,
            settings: {
                auto_reply_enabled: connection.auto_reply_enabled,
                auto_post_enabled: connection.auto_post_enabled
            }
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            error: 'Failed to update settings',
            code: 'UPDATE_SETTINGS_ERROR'
        });
    }
}

/**
 * Get leads
 * GET /api/facebook/leads
 */
async function getLeads(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const leads = await getRecentLeads(req.user.user_id, limit, offset);
        
        res.json({
            success: true,
            leads: leads.map(lead => ({
                id: lead.id,
                facebook_lead_id: lead.facebook_lead_id,
                form_name: lead.form_name,
                field_data: lead.field_data,
                created_time: lead.created_time,
                processed: lead.processed,
                ai_qualified: lead.ai_qualified,
                ai_qualification_result: lead.ai_qualification_result
            })),
            count: leads.length
        });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
            error: 'Failed to get leads',
            code: 'GET_LEADS_ERROR'
        });
    }
}

/**
 * Get lead statistics
 * GET /api/facebook/leads/stats
 */
async function getLeadsStats(req, res) {
    try {
        const days = parseInt(req.query.days) || 30;
        
        const stats = await getLeadStats(req.user.user_id, days);
        
        res.json({
            success: true,
            stats: {
                ...stats,
                period_days: days
            }
        });
    } catch (error) {
        console.error('Get lead stats error:', error);
        res.status(500).json({
            error: 'Failed to get lead statistics',
            code: 'GET_LEAD_STATS_ERROR'
        });
    }
}

/**
 * Get conversation history
 * GET /api/facebook/conversations/:senderId
 */
async function getConversation(req, res) {
    try {
        const { senderId } = req.params;
        
        const messages = await getConversationHistory(req.user.user_id, senderId);
        
        res.json({
            success: true,
            messages: messages.map(msg => ({
                id: msg.id,
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                message: msg.message,
                timestamp: msg.timestamp,
                is_from_page: msg.is_from_page,
                ai_reply_sent: msg.ai_reply_sent
            }))
        });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({
            error: 'Failed to get conversation',
            code: 'GET_CONVERSATION_ERROR'
        });
    }
}

/**
 * Send manual reply
 * POST /api/facebook/conversations/:senderId/reply
 */
async function sendReply(req, res) {
    try {
        const { senderId } = req.params;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Message is required',
                code: 'MISSING_MESSAGE'
            });
        }
        
        // Get page connection
        const { data: connection, error } = await supabase
            .from('facebook_connections')
            .select('page_id, page_access_token')
            .eq('user_id', req.user.user_id)
            .single();
        
        if (error || !connection) {
            return res.status(404).json({
                error: 'No connected page found',
                code: 'NO_CONNECTION'
            });
        }
        
        const result = await sendManualReply(
            req.user.user_id,
            senderId,
            message,
            connection.page_access_token
        );
        
        res.json({
            success: true,
            message_id: result.message_id
        });
    } catch (error) {
        console.error('Send reply error:', error);
        res.status(500).json({
            error: 'Failed to send reply',
            code: 'SEND_REPLY_ERROR'
        });
    }
}

/**
 * Test AI response
 * POST /api/facebook/test-ai
 */
async function testAIResponse(req, res) {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Message is required',
                code: 'MISSING_MESSAGE'
            });
        }
        
        const response = await generateAIResponse(
            message,
            [],
            null,
            true,
            req.user.user_id
        );
        
        res.json({
            success: true,
            response: response
        });
    } catch (error) {
        console.error('Test AI error:', error);
        res.status(500).json({
            error: 'Failed to generate AI response',
            code: 'AI_GENERATION_ERROR'
        });
    }
}

/**
 * Schedule a post
 * POST /api/facebook/posts
 */
async function createPost(req, res) {
    try {
        const { content, media_urls, link_url, scheduled_at } = req.body;
        
        if (!content) {
            return res.status(400).json({
                error: 'Content is required',
                code: 'MISSING_CONTENT'
            });
        }
        
        // Get page connection
        const { data: connection, error } = await supabase
            .from('facebook_connections')
            .select('page_id')
            .eq('user_id', req.user.user_id)
            .single();
        
        if (error || !connection) {
            return res.status(404).json({
                error: 'No connected page found',
                code: 'NO_CONNECTION'
            });
        }
        
        const post = await schedulePost({
            user_id: req.user.user_id,
            page_id: connection.page_id,
            content,
            media_urls,
            link_url,
            scheduled_at
        });
        
        res.json({
            success: true,
            post: {
                id: post.id,
                content: post.content,
                status: post.status,
                scheduled_at: post.scheduled_at,
                published_at: post.published_at,
                post_id: post.post_id
            }
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            error: 'Failed to create post',
            code: 'CREATE_POST_ERROR',
            details: error.message
        });
    }
}

/**
 * Get posts
 * GET /api/facebook/posts
 */
async function getPosts(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status;
        
        const posts = await getUserPosts(req.user.user_id, {
            status,
            limit,
            offset
        });
        
        res.json({
            success: true,
            posts: posts.map(post => ({
                id: post.id,
                content: post.content,
                media_urls: post.media_urls,
                link_url: post.link_url,
                status: post.status,
                scheduled_at: post.scheduled_at,
                published_at: post.published_at,
                post_id: post.post_id,
                error_message: post.error_message
            })),
            count: posts.length
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            error: 'Failed to get posts',
            code: 'GET_POSTS_ERROR'
        });
    }
}

/**
 * Update a post
 * PUT /api/facebook/posts/:postId
 */
async function updatePostHandler(req, res) {
    try {
        const { postId } = req.params;
        const updates = req.body;
        
        const post = await updatePost(postId, req.user.user_id, updates);
        
        res.json({
            success: true,
            post: {
                id: post.id,
                content: post.content,
                status: post.status,
                scheduled_at: post.scheduled_at
            }
        });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            error: 'Failed to update post',
            code: 'UPDATE_POST_ERROR',
            details: error.message
        });
    }
}

/**
 * Delete/cancel a post
 * DELETE /api/facebook/posts/:postId
 */
async function deletePostHandler(req, res) {
    try {
        const { postId } = req.params;
        
        await cancelPost(postId, req.user.user_id);
        
        res.json({
            success: true,
            message: 'Post cancelled/deleted'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            error: 'Failed to delete post',
            code: 'DELETE_POST_ERROR',
            details: error.message
        });
    }
}

/**
 * Manual test endpoint for lead processing
 * POST /api/facebook/test-lead
 */
async function testLeadProcessing(req, res) {
    try {
        const { leadId, pageId } = req.body;
        
        if (!leadId) {
            return res.status(400).json({
                error: 'leadId is required',
                code: 'MISSING_LEAD_ID'
            });
        }
        
        // Use connected page if no pageId provided
        let targetPageId = pageId;
        if (!targetPageId) {
            const { data: connection } = await supabase
                .from('facebook_connections')
                .select('page_id')
                .eq('user_id', req.user.user_id)
                .single();
            
            if (!connection) {
                return res.status(404).json({
                    error: 'No connected page',
                    code: 'NO_CONNECTION'
                });
            }
            targetPageId = connection.page_id;
        }
        
        const result = await processLead(targetPageId, leadId, Date.now());
        
        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Test lead error:', error);
        res.status(500).json({
            error: 'Failed to process test lead',
            code: 'TEST_LEAD_ERROR',
            details: error.message
        });
    }
}

module.exports = {
    // OAuth
    startOAuth,
    handleOAuthCallback,
    
    // Connection
    getConnection,
    disconnectPage,
    updateSettings,
    
    // Leads
    getLeads,
    getLeadsStats,
    
    // Messaging
    getConversation,
    sendReply,
    testAIResponse,
    
    // Posts
    createPost,
    getPosts,
    updatePostHandler,
    deletePostHandler,
    
    // Testing
    testLeadProcessing
};