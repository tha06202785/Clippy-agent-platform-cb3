/**
 * Facebook Webhook Handler
 * Processes real-time events from Facebook
 */

const crypto = require('crypto');
const { config, verifyWebhookSignature } = require('./facebookConfig');
const { processLead } = require('./leadProcessor');
const { processIncomingMessage } = require('./autoReplyService');
const { supabase } = require('../auth/authMiddleware');

/**
 * Handle webhook verification (GET request)
 * Facebook calls this when setting up the webhook
 */
function handleWebhookVerification(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === config.webhookVerifyToken) {
        console.log('Webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error('Webhook verification failed');
        res.status(403).send('Verification failed');
    }
}

/**
 * Handle incoming webhook events (POST request)
 * Processes leadgen, messages, and other events
 */
async function handleWebhookEvent(req, res) {
    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'];
    const body = req.body; // Raw body from express.raw middleware
    
    if (!verifyWebhookSignature(signature, body)) {
        console.error('Invalid webhook signature');
        res.status(403).json({ error: 'Invalid signature' });
        return;
    }
    
    // Parse the body
    let data;
    try {
        data = JSON.parse(body);
    } catch (e) {
        console.error('Invalid JSON in webhook body');
        res.status(400).json({ error: 'Invalid JSON' });
        return;
    }
    
    // Log webhook event
    console.log('Received Facebook webhook:', {
        object: data.object,
        entries: data.entry?.length
    });
    
    // Respond immediately to Facebook
    res.status(200).send('EVENT_RECEIVED');
    
    // Process events asynchronously
    if (data.object === 'page') {
        for (const entry of data.entry || []) {
            const pageId = entry.id;
            
            // Store webhook event for audit
            await logWebhookEvent('page_webhook', pageId, entry);
            
            // Process different event types
            for (const event of entry.changes || []) {
                await processEvent(pageId, event.value, entry.time);
            }
            
            // Process messaging events (different structure)
            for (const messaging of entry.messaging || []) {
                await processMessagingEvent(pageId, messaging);
            }
        }
    }
}

/**
 * Process individual event from webhook
 */
async function processEvent(pageId, eventData, timestamp) {
    const eventType = eventData.field || eventData.item;
    
    console.log(`Processing ${eventType} event for page ${pageId}`);
    
    try {
        switch (eventType) {
            case 'leadgen':
                // New lead from Lead Ads
                if (eventData.leadgen_id) {
                    await processLead(pageId, eventData.leadgen_id, timestamp);
                }
                break;
                
            case 'feed':
                // Post/comment activity
                if (eventData.item === 'comment') {
                    await processComment(pageId, eventData);
                }
                break;
                
            case 'messages':
                // Messenger events (usually in entry.messaging, but handle here too)
                break;
                
            default:
                console.log(`Unhandled event type: ${eventType}`);
        }
    } catch (error) {
        console.error(`Error processing ${eventType} event:`, error);
        await logWebhookEvent(eventType, pageId, eventData, error.message);
    }
}

/**
 * Process messaging events
 */
async function processMessagingEvent(pageId, messaging) {
    // Only handle messages from users (not echo from page)
    if (messaging.message && !messaging.message.is_echo) {
        const senderId = messaging.sender.id;
        const message = messaging.message.text;
        const messageId = messaging.message.mid;
        const timestamp = messaging.timestamp;
        
        console.log(`Processing message from ${senderId}: ${message?.substring(0, 50)}`);
        
        await processIncomingMessage(pageId, senderId, message, messageId, timestamp);
    }
    
    // Handle message_delivered events
    if (messaging.delivery) {
        console.log(`Messages delivered`);
    }
    
    // Handle message_reads
    if (messaging.read) {
        const readerId = messaging.sender ? messaging.sender.id : 'unknown';
        console.log(`Messages read by ${readerId}`);
    }
    
    // Handle opt-in (messaging_optins)
    if (messaging.optin) {
        const optInId = messaging.sender ? messaging.sender.id : 'unknown';
        console.log(`Opt-in received from ${optInId}`);
    }
}

/**
 * Process comment events
 */
async function processComment(pageId, commentData) {
    console.log(`Processing comment on page ${pageId}:`, {
        commentId: commentData.comment_id,
        from: commentData.from?.name
    });
    
    // Could implement auto-reply to comments here
    // For now, just log the event
    await logWebhookEvent('comment', pageId, commentData);
}

/**
 * Log webhook event to database for debugging
 */
async function logWebhookEvent(eventType, pageId, payload, errorMessage = null) {
    try {
        await supabase
            .from('facebook_webhook_events')
            .insert({
                event_type: eventType,
                page_id: pageId,
                payload: payload,
                processed: !errorMessage,
                error_message: errorMessage
            });
    } catch (e) {
        console.error('Failed to log webhook event:', e);
    }
}

/**
 * Test webhook endpoint (for manual testing)
 */
async function testWebhook(req, res) {
    // Allow manual testing of webhook processing
    const { event_type, page_id, payload } = req.body || {};
    
    if (!event_type || !page_id) {
        return res.status(400).json({ 
            error: 'Missing required fields: event_type, page_id' 
        });
    }
    
    try {
        await processEvent(page_id, { field: event_type, ...payload }, Date.now());
        res.json({ success: true, message: 'Event processed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    handleWebhookVerification,
    handleWebhookEvent,
    processEvent,
    processMessagingEvent,
    testWebhook
};