/**
 * Auto-Reply Service
 * Handles automatic responses to Messenger messages using AI
 */

const { sendMessengerMessage, getUserProfile } = require('./facebookService');
const { supabase } = require('../auth/authMiddleware');

/**
 * Process incoming Messenger message
 * @param {string} pageId - Facebook Page ID
 * @param {string} senderId - Sender's PSID
 * @param {string} message - Message text
 * @param {string} messageId - Facebook message ID
 * @param {number} timestamp - Message timestamp
 */
async function processIncomingMessage(pageId, senderId, message, messageId, timestamp) {
    console.log(`Processing message from ${senderId}: ${message?.substring(0, 50)}`);
    
    try {
        // Get page connection
        const { data: connection, error: connError } = await supabase
            .from('facebook_connections')
            .select('*')
            .eq('page_id', pageId)
            .single();
        
        if (connError || !connection) {
            throw new Error(`No connection found for page ${pageId}`);
        }
        
        // Store the message
        const { data: savedMessage, error: saveError } = await supabase
            .from('facebook_messages')
            .insert({
                user_id: connection.user_id,
                sender_id: senderId,
                recipient_id: pageId,
                message: message,
                message_id: messageId,
                timestamp: new Date(timestamp).toISOString(),
                is_from_page: false,
                ai_reply_sent: false
            })
            .select()
            .single();
        
        if (saveError) {
            console.error('Failed to save message:', saveError);
        }
        
        // Check if auto-reply is enabled
        if (!connection.auto_reply_enabled) {
            console.log('Auto-reply disabled for this page');
            return { replied: false, reason: 'auto_reply_disabled' };
        }
        
        // Check if this is a new conversation (first message)
        const { data: previousMessages } = await supabase
            .from('facebook_messages')
            .select('id')
            .eq('user_id', connection.user_id)
            .eq('sender_id', senderId)
            .neq('id', savedMessage?.id || '0')
            .limit(1);
        
        const isNewConversation = !previousMessages || previousMessages.length === 0;
        
        // Get conversation history for context
        const { data: conversationHistory } = await supabase
            .from('facebook_messages')
            .select('message, is_from_page, created_at')
            .eq('user_id', connection.user_id)
            .eq('sender_id', senderId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        // Get sender profile
        let senderProfile;
        try {
            senderProfile = await getUserProfile(senderId, connection.page_access_token);
        } catch (e) {
            console.warn('Could not get sender profile:', e.message);
        }
        
        // Generate AI response
        const aiResponse = await generateAIResponse(
            message,
            conversationHistory || [],
            senderProfile,
            isNewConversation,
            connection.user_id
        );
        
        if (!aiResponse) {
            console.log('No AI response generated');
            return { replied: false, reason: 'no_response' };
        }
        
        // Send the reply
        const sentMessage = await sendMessengerMessage(
            senderId,
            aiResponse,
            connection.page_access_token
        );
        
        // Store the AI reply
        await supabase
            .from('facebook_messages')
            .insert({
                user_id: connection.user_id,
                sender_id: pageId,
                recipient_id: senderId,
                message: aiResponse,
                message_id: sentMessage.message_id,
                timestamp: new Date().toISOString(),
                is_from_page: true,
                ai_reply_sent: true
            });
        
        // Update the original message
        if (savedMessage) {
            await supabase
                .from('facebook_messages')
                .update({ ai_reply_sent: true, ai_reply_message: aiResponse })
                .eq('id', savedMessage.id);
        }
        
        console.log(`AI reply sent to ${senderId}`);
        return { replied: true, messageId: sentMessage.message_id };
        
    } catch (error) {
        console.error('Error processing incoming message:', error);
        throw error;
    }
}

/**
 * Generate AI response using OpenAI
 * @param {string} incomingMessage - The user's message
 * @param {Array} history - Previous messages in conversation
 * @param {Object} profile - Sender's Facebook profile
 * @param {boolean} isNewConversation - Whether this is the first message
 * @param {string} userId - The business owner's user ID (for context)
 * @returns {Promise<string>} AI-generated response
 */
async function generateAIResponse(incomingMessage, history, profile, isNewConversation, userId) {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
        // Return a default response if OpenAI not configured
        return getDefaultResponse(incomingMessage, isNewConversation);
    }
    
    try {
        // Get user's business context (optional)
        const businessContext = await getBusinessContext(userId);
        
        // Format conversation history
        const formattedHistory = history
            .reverse()
            .map(msg => ({
                role: msg.is_from_page ? 'assistant' : 'user',
                content: msg.message
            }));
        
        // Build the prompt
        const systemPrompt = buildSystemPrompt(businessContext, isNewConversation);
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...formattedHistory,
            { role: 'user', content: incomingMessage }
        ];
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        if (result.choices && result.choices[0]) {
            return result.choices[0].message.content.trim();
        }
        
        throw new Error('No response from OpenAI');
        
    } catch (error) {
        console.error('OpenAI API error:', error);
        return getDefaultResponse(incomingMessage, isNewConversation);
    }
}

/**
 * Build system prompt for AI
 */
function buildSystemPrompt(businessContext, isNewConversation) {
    const firstName = businessContext?.name || 'there';
    
    let prompt = `You are a helpful and professional customer service assistant for ${businessContext?.business_name || 'our business'}. 

Guidelines:
- Be friendly, professional, and concise
- Answer questions accurately based on the information provided
- If you don't know something, say so and offer to have a human follow up
- Keep responses under 3-4 sentences when possible
- Always be helpful and solution-oriented
- Use a warm, conversational tone`;
    
    if (businessContext?.business_type) {
        prompt += `\n\nBusiness Type: ${businessContext.business_type}`;
    }
    
    if (businessContext?.services) {
        prompt += `\n\nServices offered: ${businessContext.services}`;
    }
    
    if (businessContext?.hours) {
        prompt += `\n\nBusiness hours: ${businessContext.hours}`;
    }
    
    if (isNewConversation) {
        prompt += `\n\nThis is a NEW conversation. Start with a warm greeting and ask how you can help.`;
    }
    
    return prompt;
}

/**
 * Get user's business context from database
 */
async function getBusinessContext(userId) {
    try {
        // Check for business profile table
        const { data } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (data) {
            return data;
        }
        
        // Fallback to user data
        const { data: user } = await supabase
            .from('users')
            .select('name, business_name')
            .eq('id', userId)
            .single();
        
        return user || {};
    } catch (e) {
        return {};
    }
}

/**
 * Get default response when AI is unavailable
 */
function getDefaultResponse(incomingMessage, isNewConversation) {
    const lowerMessage = incomingMessage.toLowerCase();
    
    // Check for common keywords
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
        return "Thanks for your interest! I'd be happy to discuss pricing with you. Could you share a bit more about what you're looking for so I can provide accurate information?";
    }
    
    if (lowerMessage.includes('hour') || lowerMessage.includes('open') || lowerMessage.includes('time')) {
        return "Thanks for asking about our hours! Let me get that information for you. Is there anything specific you'd like to know about?";
    }
    
    if (lowerMessage.includes('location') || lowerMessage.includes('address') || lowerMessage.includes('where')) {
        return "I'd be happy to help with directions! Let me provide our location details. Is there anything else you need?";
    }
    
    if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
        return "I'd love to help you schedule something! Let me check availability and get back to you shortly.";
    }
    
    if (isNewConversation) {
        return "Hi there! Thanks for reaching out. How can I help you today?";
    }
    
    return "Thanks for your message! Let me look into that for you and get back to you shortly.";
}

/**
 * Get conversation history for a sender
 * @param {string} userId - Business owner user ID
 * @param {string} senderId - Facebook sender ID
 * @returns {Promise<Array>} Message history
 */
async function getConversationHistory(userId, senderId) {
    const { data, error } = await supabase
        .from('facebook_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('sender_id', senderId)
        .or(`recipient_id.eq.${senderId}`)
        .order('timestamp', { ascending: true })
        .limit(50);
    
    if (error) {
        throw new Error(`Failed to fetch conversation: ${error.message}`);
    }
    
    return data || [];
}

/**
 * Send manual reply (from human)
 * @param {string} userId - Business owner ID
 * @param {string} senderId - Facebook sender ID
 * @param {string} message - Reply message
 * @param {string} pageAccessToken - Page access token
 */
async function sendManualReply(userId, senderId, message, pageAccessToken) {
    const sentMessage = await sendMessengerMessage(senderId, message, pageAccessToken);
    
    // Store in database
    await supabase
        .from('facebook_messages')
        .insert({
            user_id: userId,
            sender_id: senderId, // This should be page ID, need to get it
            recipient_id: senderId,
            message: message,
            message_id: sentMessage.message_id,
            timestamp: new Date().toISOString(),
            is_from_page: true,
            ai_reply_sent: false
        });
    
    return sentMessage;
}

module.exports = {
    processIncomingMessage,
    getConversationHistory,
    sendManualReply,
    generateAIResponse
};