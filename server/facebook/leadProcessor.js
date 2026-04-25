/**
 * Lead Processor
 * Handles processing of new leads from Facebook Lead Ads
 */

const { fetchLeadData, getFormDetails } = require('./facebookService');
const { supabase } = require('../auth/authMiddleware');

/**
 * Process a new lead from webhook
 * @param {string} pageId - Facebook Page ID
 * @param {string} leadId - Facebook lead ID
 * @param {number} timestamp - Event timestamp
 */
async function processLead(pageId, leadId, timestamp) {
    console.log(`Processing lead ${leadId} for page ${pageId}`);
    
    try {
        // Get the connection for this page
        const { data: connection, error: connError } = await supabase
            .from('facebook_connections')
            .select('*')
            .eq('page_id', pageId)
            .single();
        
        if (connError || !connection) {
            throw new Error(`No connection found for page ${pageId}`);
        }
        
        // Fetch lead data from Facebook
        const leadData = await fetchLeadData(leadId, connection.page_access_token);
        
        // Get form details if available
        let formName = null;
        if (leadData.form_id) {
            try {
                const form = await getFormDetails(leadData.form_id, connection.page_access_token);
                formName = form.name;
            } catch (e) {
                console.warn('Could not fetch form details:', e.message);
            }
        }
        
        // Extract contact info from field_data
        const fieldData = leadData.field_data || {};
        const email = fieldData.email || fieldData.email_address;
        const phone = fieldData.phone_number || fieldData.phone;
        const fullName = fieldData.full_name || `${fieldData.first_name || ''} ${fieldData.last_name || ''}`.trim();
        
        // Store lead in database
        const { data: savedLead, error: saveError } = await supabase
            .from('facebook_leads')
            .insert({
                user_id: connection.user_id,
                facebook_lead_id: leadData.facebook_lead_id,
                page_id: pageId,
                form_id: leadData.form_id,
                form_name: formName,
                field_data: fieldData,
                campaign_id: leadData.campaign_id,
                ad_id: leadData.ad_id,
                created_time: leadData.created_time,
                processed: false,
                synced_to_crm: false,
                ai_qualified: false
            })
            .select()
            .single();
        
        if (saveError) {
            // Check if it's a duplicate
            if (saveError.message?.includes('duplicate')) {
                console.log(`Lead ${leadId} already exists, skipping`);
                return { skipped: true };
            }
            throw saveError;
        }
        
        console.log(`Lead saved: ${savedLead.id}`);
        
        // Create entry in main leads table (if it exists)
        try {
            await createMainLeadEntry(savedLead, connection.user_id);
        } catch (e) {
            console.warn('Could not create main lead entry:', e.message);
        }
        
        // Trigger AI qualification
        try {
            await qualifyLeadWithAI(savedLead);
        } catch (e) {
            console.warn('AI qualification failed:', e.message);
        }
        
        // Send notification to user
        try {
            await notifyUserOfLead(savedLead, connection.user_id);
        } catch (e) {
            console.warn('Failed to notify user:', e.message);
        }
        
        // Attempt CRM sync
        try {
            await syncToCRM(savedLead);
        } catch (e) {
            console.warn('CRM sync failed:', e.message);
        }
        
        // Mark as processed
        await supabase
            .from('facebook_leads')
            .update({ processed: true })
            .eq('id', savedLead.id);
        
        return { 
            success: true, 
            leadId: savedLead.id,
            facebookLeadId: leadData.facebook_lead_id
        };
        
    } catch (error) {
        console.error('Error processing lead:', error);
        throw error;
    }
}

/**
 * Create entry in main leads table
 */
async function createMainLeadEntry(facebookLead, userId) {
    // Check if leads table exists
    const { data: tableExists } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'leads')
        .single();
    
    if (!tableExists) {
        console.log('Main leads table does not exist, skipping');
        return;
    }
    
    const fieldData = facebookLead.field_data || {};
    const name = fieldData.full_name || `${fieldData.first_name || ''} ${fieldData.last_name || ''}`.trim() || 'Unknown';
    const email = fieldData.email || fieldData.email_address;
    const phone = fieldData.phone_number || fieldData.phone;
    
    const { error } = await supabase
        .from('leads')
        .insert({
            user_id: userId,
            source: 'facebook_lead_ad',
            source_id: facebookLead.facebook_lead_id,
            name: name,
            email: email,
            phone: phone,
            status: 'new',
            metadata: {
                facebook_lead_id: facebookLead.id,
                form_id: facebookLead.form_id,
                form_name: facebookLead.form_name,
                campaign_id: facebookLead.campaign_id,
                ad_id: facebookLead.ad_id,
                raw_data: fieldData
            }
        });
    
    if (error) {
        throw new Error(`Failed to create main lead: ${error.message}`);
    }
}

/**
 * Qualify lead using AI
 */
async function qualifyLeadWithAI(lead) {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
        console.log('OpenAI key not configured, skipping AI qualification');
        return;
    }
    
    try {
        const fieldData = lead.field_data || {};
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a lead qualification assistant. Analyze the lead data and provide:
                        1. A qualification score (0-100)
                        2. The lead's likely intent
                        3. Priority level (high/medium/low)
                        4. Recommended next action
                        
                        Respond in JSON format with keys: score, intent, priority, recommendation`
                    },
                    {
                        role: 'user',
                        content: `Lead data: ${JSON.stringify(fieldData, null, 2)}`
                    }
                ],
                temperature: 0.3
            })
        });
        
        const result = await response.json();
        
        if (result.choices && result.choices[0]) {
            const aiResponse = result.choices[0].message.content;
            let qualification;
            
            try {
                qualification = JSON.parse(aiResponse);
            } catch (e) {
                // If not valid JSON, store the raw text
                qualification = { raw_response: aiResponse };
            }
            
            // Update lead with AI qualification
            await supabase
                .from('facebook_leads')
                .update({
                    ai_qualified: true,
                    ai_qualification_result: qualification
                })
                .eq('id', lead.id);
            
            console.log(`Lead ${lead.id} AI qualified with score: ${qualification.score || 'N/A'}`);
        }
    } catch (error) {
        console.error('AI qualification error:', error);
        throw error;
    }
}

/**
 * Send notification to user about new lead
 */
async function notifyUserOfLead(lead, userId) {
    // Get user details
    const { data: user, error } = await supabase
        .from('users')
        .select('email, notification_preferences')
        .eq('id', userId)
        .single();
    
    if (error || !user) {
        throw new Error('User not found');
    }
    
    // Check notification preferences
    const prefs = user.notification_preferences || {};
    
    if (prefs.email_new_leads !== false) {
        // Send email notification
        try {
            const { sendLeadNotification } = require('../auth/emailService');
            await sendLeadNotification(user.email, lead);
            console.log(`Email notification sent to ${user.email}`);
        } catch (e) {
            console.warn('Failed to send email notification:', e.message);
        }
    }
    
    // Could also add push notifications, Slack, etc. here
}

/**
 * Sync lead to external CRM
 */
async function syncToCRM(lead) {
    // Placeholder for CRM integration
    // Implement based on user's CRM (Salesforce, HubSpot, etc.)
    
    console.log('CRM sync not implemented, skipping');
    
    // Example for future implementation:
    // const { syncToHubSpot } = require('../integrations/hubspot');
    // await syncToHubSpot(lead);
    // 
    // await supabase
    //     .from('facebook_leads')
    //     .update({ synced_to_crm: true })
    //     .eq('id', lead.id);
}

/**
 * Get recent leads for a user
 */
async function getRecentLeads(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
        .from('facebook_leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_time', { ascending: false })
        .range(offset, offset + limit - 1);
    
    if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`);
    }
    
    return data || [];
}

/**
 * Get lead statistics for a user
 */
async function getLeadStats(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
        .from('facebook_leads')
        .select('processed, synced_to_crm, ai_qualified')
        .eq('user_id', userId)
        .gte('created_time', startDate.toISOString());
    
    if (error) {
        throw new Error(`Failed to fetch stats: ${error.message}`);
    }
    
    const total = data.length;
    const processed = data.filter(l => l.processed).length;
    const synced = data.filter(l => l.synced_to_crm).length;
    const qualified = data.filter(l => l.ai_qualified).length;
    
    return {
        total,
        processed,
        synced,
        qualified,
        unprocessed: total - processed
    };
}

module.exports = {
    processLead,
    getRecentLeads,
    getLeadStats
};