/**
 * CRM Webhook Handler
 * Receives and processes webhooks from CRM providers
 * Supported: FUB, Lofty, Chime
 */

const crypto = require('crypto');
const { supabase } = require('../auth/authMiddleware');
const { logSyncActivity, CRM_CONFIG } = require('./crmController');

/**
 * Handle incoming webhooks from CRM providers
 * POST /webhooks/crm/:crmType
 */
async function handleWebhook(req, res) {
    const { crmType } = req.params;
    
    try {
        // Get raw body for signature verification
        const rawBody = req.body;
        const payload = JSON.parse(rawBody.toString());
        
        console.log(`Received ${crmType} webhook:`, payload);
        
        // Find user by webhook signature or payload
        const userId = await identifyWebhookSource(crmType, payload, req.headers, rawBody);
        
        if (!userId) {
            console.warn(`Could not identify ${crmType} webhook source`);
            // Return 200 to prevent retries, but don't process
            return res.status(200).json({ received: true, processed: false });
        }
        
        // Verify webhook signature if supported
        const isValid = await verifyWebhookSignature(crmType, rawBody, req.headers, userId);
        if (!isValid) {
            console.warn(`Invalid ${crmType} webhook signature`);
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        // Process webhook based on CRM type
        const result = await processWebhook(crmType, payload, userId);
        
        // Log the webhook receipt
        await logSyncActivity(
            userId,
            crmType,
            result.leadId || null,
            'webhook_received',
            result.success ? 'success' : 'failed',
            result.error || null,
            payload,
            result.data || null
        );
        
        res.status(200).json({ 
            received: true, 
            processed: result.success,
            lead_id: result.leadId || null
        });
        
    } catch (error) {
        console.error(`Webhook handler error for ${crmType}:`, error);
        // Return 200 to prevent retries, log error
        res.status(200).json({ 
            received: true, 
            processed: false,
            error: error.message 
        });
    }
}

/**
 * Identify which user this webhook is for
 */
async function identifyWebhookSource(crmType, payload, headers, rawBody) {
    try {
        // Different CRMs send different identifying information
        switch (crmType) {
            case 'fub': {
                // FUB webhooks include user info or can be matched by webhook URL
                // Check if payload has user info
                if (payload.userId) {
                    const { data } = await supabase
                        .from('crm_connections')
                        .select('user_id')
                        .eq('crm_type', 'fub')
                        .eq('webhook_url', `like`, `%${payload.userId}%`)
                        .single();
                    return data?.user_id;
                }
                
                // Find user by contact ID if it exists locally
                if (payload.contactId) {
                    const { data } = await supabase
                        .from('crm_lead_mappings')
                        .select('user_id')
                        .eq('crm_type', 'fub')
                        .eq('crm_contact_id', payload.contactId.toString())
                        .single();
                    return data?.user_id;
                }
                
                return null;
            }
            
            case 'lofty': {
                // Lofty webhooks include account info
                if (payload.accountId) {
                    const { data } = await supabase
                        .from('crm_connections')
                        .select('user_id')
                        .eq('crm_type', 'lofty')
                        .single(); // In production, would match by account ID
                    return data?.user_id;
                }
                
                if (payload.leadId) {
                    const { data } = await supabase
                        .from('crm_lead_mappings')
                        .select('user_id')
                        .eq('crm_type', 'lofty')
                        .eq('crm_contact_id', payload.leadId.toString())
                        .single();
                    return data?.user_id;
                }
                
                return null;
            }
            
            case 'chime': {
                // Chime webhooks
                if (payload.userId) {
                    const { data } = await supabase
                        .from('crm_connections')
                        .select('user_id')
                        .eq('crm_type', 'chime')
                        .single();
                    return data?.user_id;
                }
                
                if (payload.contactId) {
                    const { data } = await supabase
                        .from('crm_lead_mappings')
                        .select('user_id')
                        .eq('crm_type', 'chime')
                        .eq('crm_contact_id', payload.contactId.toString())
                        .single();
                    return data?.user_id;
                }
                
                return null;
            }
            
            default:
                return null;
        }
    } catch (error) {
        console.error('Error identifying webhook source:', error);
        return null;
    }
}

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(crmType, rawBody, headers, userId) {
    try {
        // Get user's CRM connection to retrieve webhook secret
        const { data: connection } = await supabase
            .from('crm_connections')
            .select('api_key')
            .eq('user_id', userId)
            .eq('crm_type', crmType)
            .single();
        
        if (!connection) return false;
        
        const signatureHeader = CRM_CONFIG[crmType]?.webhookSecretHeader;
        const signature = headers[signatureHeader?.toLowerCase()] || headers[signatureHeader];
        
        if (!signature) {
            // Some CRMs don't use signatures, skip verification
            return true;
        }
        
        // Decrypt API key to use as secret
        const { decryptApiKey } = require('./crmController');
        const apiKey = decryptApiKey(connection.api_key);
        
        switch (crmType) {
            case 'fub': {
                // FUB uses HMAC-SHA256
                const expectedSignature = crypto
                    .createHmac('sha256', apiKey)
                    .update(rawBody)
                    .digest('hex');
                return crypto.timingSafeEqual(
                    Buffer.from(signature),
                    Buffer.from(expectedSignature)
                );
            }
            
            case 'lofty': {
                // Lofty signature verification
                const expectedSignature = crypto
                    .createHmac('sha256', apiKey)
                    .update(rawBody)
                    .digest('hex');
                return signature === expectedSignature;
            }
            
            case 'chime': {
                // Chime signature verification
                const expectedSignature = crypto
                    .createHmac('sha256', apiKey)
                    .update(rawBody)
                    .digest('base64');
                return signature === expectedSignature;
            }
            
            default:
                return false;
        }
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Process webhook payload based on CRM type
 */
async function processWebhook(crmType, payload, userId) {
    try {
        switch (crmType) {
            case 'fub':
                return await processFUBWebhook(payload, userId);
            case 'lofty':
                return await processLoftyWebhook(payload, userId);
            case 'chime':
                return await processChimeWebhook(payload, userId);
            default:
                return { success: false, error: 'Unknown CRM type' };
        }
    } catch (error) {
        console.error(`Error processing ${crmType} webhook:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Process FUB webhook
 */
async function processFUBWebhook(payload, userId) {
    const eventType = payload.event || payload.type;
    const contactId = payload.contactId || payload.contact?.id;
    
    if (!contactId) {
        return { success: false, error: 'No contact ID in payload' };
    }
    
    // Find local lead mapping
    const { data: mapping } = await supabase
        .from('crm_lead_mappings')
        .select('local_lead_id')
        .eq('crm_type', 'fub')
        .eq('crm_contact_id', contactId.toString())
        .eq('user_id', userId)
        .single();
    
    let leadId = mapping?.local_lead_id;
    
    switch (eventType) {
        case 'contact.updated':
        case 'ContactUpdated': {
            // Update lead status or info
            if (leadId) {
                const updates = {
                    status: payload.contact?.stage || payload.contact?.status,
                    updated_at: new Date().toISOString()
                };
                
                // Add any tags as notes
                if (payload.contact?.tags) {
                    updates.tags = payload.contact.tags;
                }
                
                await supabase
                    .from('leads')
                    .update(updates)
                    .eq('id', leadId);
            }
            break;
        }
        
        case 'contact.created':
        case 'ContactCreated': {
            // New contact created in FUB - may need to sync back
            break;
        }
        
        case 'appointment.created':
        case 'AppointmentCreated': {
            // Appointment created in FUB
            if (leadId) {
                await supabase
                    .from('leads')
                    .update({
                        appointment_scheduled: true,
                        appointment_date: payload.appointment?.date,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', leadId);
                
                // Trigger notification
                await notifyUser(userId, leadId, 'appointment_scheduled', {
                    message: `Appointment scheduled in FUB: ${payload.appointment?.date}`
                });
            }
            break;
        }
        
        case 'task.completed':
        case 'TaskCompleted': {
            // Task completed
            if (leadId) {
                await notifyUser(userId, leadId, 'task_completed', {
                    message: `Task completed in FUB: ${payload.task?.description}`
                });
            }
            break;
        }
    }
    
    // Update sync status
    if (leadId) {
        await supabase
            .from('crm_lead_mappings')
            .update({
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced'
            })
            .eq('local_lead_id', leadId)
            .eq('crm_type', 'fub');
    }
    
    return { 
        success: true, 
        leadId,
        event: eventType,
        data: { crm_contact_id: contactId }
    };
}

/**
 * Process Lofty webhook
 */
async function processLoftyWebhook(payload, userId) {
    const eventType = payload.event || payload.type;
    const leadId = payload.leadId || payload.lead?.id;
    
    if (!leadId) {
        return { success: false, error: 'No lead ID in payload' };
    }
    
    // Find local lead mapping
    const { data: mapping } = await supabase
        .from('crm_lead_mappings')
        .select('local_lead_id')
        .eq('crm_type', 'lofty')
        .eq('crm_contact_id', leadId.toString())
        .eq('user_id', userId)
        .single();
    
    let localLeadId = mapping?.local_lead_id;
    
    switch (eventType) {
        case 'lead.updated':
        case 'lead.status_changed': {
            if (localLeadId) {
                await supabase
                    .from('leads')
                    .update({
                        status: payload.lead?.status || payload.newStatus,
                        score: payload.lead?.score,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', localLeadId);
            }
            break;
        }
        
        case 'lead.created': {
            // New lead in Lofty
            break;
        }
        
        case 'activity.created': {
            // New activity logged
            if (localLeadId) {
                await notifyUser(userId, localLeadId, 'activity_logged', {
                    message: `New activity in Lofty: ${payload.activity?.type}`,
                    activity: payload.activity
                });
            }
            break;
        }
        
        case 'appointment.scheduled': {
            if (localLeadId) {
                await supabase
                    .from('leads')
                    .update({
                        appointment_scheduled: true,
                        appointment_date: payload.appointment?.datetime,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', localLeadId);
                
                await notifyUser(userId, localLeadId, 'appointment_scheduled', {
                    message: `Appointment scheduled in Lofty`
                });
            }
            break;
        }
    }
    
    if (localLeadId) {
        await supabase
            .from('crm_lead_mappings')
            .update({
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced'
            })
            .eq('local_lead_id', localLeadId)
            .eq('crm_type', 'lofty');
    }
    
    return { 
        success: true, 
        leadId: localLeadId,
        event: eventType,
        data: { crm_lead_id: leadId }
    };
}

/**
 * Process Chime webhook
 */
async function processChimeWebhook(payload, userId) {
    const eventType = payload.event || payload.type || payload.eventType;
    const contactId = payload.contactId || payload.contact?.id;
    
    if (!contactId) {
        return { success: false, error: 'No contact ID in payload' };
    }
    
    // Find local lead mapping
    const { data: mapping } = await supabase
        .from('crm_lead_mappings')
        .select('local_lead_id')
        .eq('crm_type', 'chime')
        .eq('crm_contact_id', contactId.toString())
        .eq('user_id', userId)
        .single();
    
    let leadId = mapping?.local_lead_id;
    
    switch (eventType) {
        case 'contact.updated':
        case 'Contact.StatusChanged': {
            if (leadId) {
                await supabase
                    .from('leads')
                    .update({
                        status: payload.contact?.status || payload.newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', leadId);
            }
            break;
        }
        
        case 'contact.created': {
            // New contact in Chime
            break;
        }
        
        case 'appointment.created': {
            if (leadId) {
                await supabase
                    .from('leads')
                    .update({
                        appointment_scheduled: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', leadId);
                
                await notifyUser(userId, leadId, 'appointment_scheduled', {
                    message: 'Appointment scheduled in Chime'
                });
            }
            break;
        }
        
        case 'note.added': {
            if (leadId) {
                await notifyUser(userId, leadId, 'note_added', {
                    message: `Note added in Chime: ${payload.note?.content?.substring(0, 100)}...`
                });
            }
            break;
        }
    }
    
    if (leadId) {
        await supabase
            .from('crm_lead_mappings')
            .update({
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced'
            })
            .eq('local_lead_id', leadId)
            .eq('crm_type', 'chime');
    }
    
    return { 
        success: true, 
        leadId,
        event: eventType,
        data: { crm_contact_id: contactId }
    };
}

/**
 * Send notification to user
 */
async function notifyUser(userId, leadId, type, data) {
    try {
        // Insert notification into database
        await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                lead_id: leadId,
                type: type,
                message: data.message,
                data: data,
                read: false,
                created_at: new Date().toISOString()
            });
        
        // Could also trigger real-time notifications here (WebSocket, push, etc.)
        console.log(`Notification sent to user ${userId}: ${data.message}`);
        
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
}

module.exports = {
    handleWebhook,
    processWebhook,
    notifyUser
};
