/**
 * CRM Controller
 * Handles CRM connection, disconnection, and status management
 * Supports FUB (Follow Up Boss), Lofty, and Chime
 */

const crypto = require('crypto');
const { supabase } = require('../auth/authMiddleware');
const { syncLeadToCRM } = require('./syncService');

// CRM API Configuration
const CRM_CONFIG = {
  fub: {
    name: 'Follow Up Boss',
    baseUrl: 'https://api.followupboss.com/v1',
    apiDocs: 'https://developer.followupboss.com/',
    webhookSupported: true,
    webhookSecretHeader: 'X-FUB-Signature'
  },
  lofty: {
    name: 'Lofty',
    baseUrl: 'https://api.lofty.com/v1',
    apiDocs: 'https://developers.lofty.com/',
    webhookSupported: true,
    webhookSecretHeader: 'X-Lofty-Signature'
  },
  chime: {
    name: 'Chime',
    baseUrl: 'https://api.chime.com/v1',
    apiDocs: 'https://developers.chime.com/',
    webhookSupported: true,
    webhookSecretHeader: 'X-Chime-Signature'
  }
};

/**
 * Validate CRM API key by making a test request
 * @param {string} crmType - 'fub', 'lofty', or 'chime'
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>} - True if valid
 */
async function validateApiKey(crmType, apiKey) {
  try {
    const config = CRM_CONFIG[crmType];
    if (!config) throw new Error('Unsupported CRM type');

    const fetch = (await import('node-fetch')).default;
    
    switch (crmType) {
      case 'fub': {
        const response = await fetch(`${config.baseUrl}/users/me`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        return response.ok;
      }
      case 'lofty': {
        const response = await fetch(`${config.baseUrl}/me`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });
        return response.ok;
      }
      case 'chime': {
        const response = await fetch(`${config.baseUrl}/user`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });
        return response.ok;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error('CRM API validation error:', error);
    return false;
  }
}

/**
 * Connect CRM
 * POST /api/crm/connect
 */
async function connectCRM(req, res) {
  try {
    const { crmType, apiKey } = req.body;

    if (!crmType || !apiKey) {
      return res.status(400).json({
        error: 'crmType and apiKey are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    if (!CRM_CONFIG[crmType]) {
      return res.status(400).json({
        error: 'Unsupported CRM type. Use: fub, lofty, or chime',
        code: 'INVALID_CRM_TYPE'
      });
    }

    // Validate API key with CRM provider
    const isValid = await validateApiKey(crmType, apiKey);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Encrypt API key before storing
    const encryptedKey = encryptApiKey(apiKey);

    // Store connection
    const { error: upsertError } = await supabase
      .from('crm_connections')
      .upsert({
        user_id: req.user.user_id,
        crm_type: crmType,
        api_key: encryptedKey,
        sync_enabled: true,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,crm_type'
      });

    if (upsertError) {
      throw new Error(`Failed to store connection: ${upsertError.message}`);
    }

    // Log connection
    await logSyncActivity(req.user.user_id, crmType, null, 'connected', 'success');

    res.json({
      success: true,
      message: `${CRM_CONFIG[crmType].name} connected successfully`,
      crm_type: crmType,
      webhook_url: `${process.env.PUBLIC_URL}/webhooks/crm/${crmType}`
    });

  } catch (error) {
    console.error('CRM connect error:', error);
    res.status(500).json({
      error: 'Failed to connect CRM',
      code: 'CONNECT_ERROR',
      details: error.message
    });
  }
}

/**
 * Disconnect CRM
 * POST /api/crm/disconnect
 */
async function disconnectCRM(req, res) {
  try {
    const { crmType } = req.body;

    if (!crmType) {
      return res.status(400).json({
        error: 'crmType is required',
        code: 'MISSING_CRM_TYPE'
      });
    }

    // Get connection before deleting
    const { data: connection, error: fetchError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('user_id', req.user.user_id)
      .eq('crm_type', crmType)
      .single();

    if (fetchError || !connection) {
      return res.status(404).json({
        error: 'CRM connection not found',
        code: 'CONNECTION_NOT_FOUND'
      });
    }

    // Delete connection
    const { error: deleteError } = await supabase
      .from('crm_connections')
      .delete()
      .eq('user_id', req.user.user_id)
      .eq('crm_type', crmType);

    if (deleteError) {
      throw new Error(`Failed to disconnect: ${deleteError.message}`);
    }

    // Delete lead mappings for this CRM
    await supabase
      .from('crm_lead_mappings')
      .delete()
      .eq('user_id', req.user.user_id)
      .eq('crm_type', crmType);

    // Log disconnection
    await logSyncActivity(req.user.user_id, crmType, null, 'disconnected', 'success');

    res.json({
      success: true,
      message: `${CRM_CONFIG[crmType].name} disconnected successfully`
    });

  } catch (error) {
    console.error('CRM disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect CRM',
      code: 'DISCONNECT_ERROR',
      details: error.message
    });
  }
}

/**
 * Get CRM connection status
 * GET /api/crm/status
 */
async function getCRMStatus(req, res) {
  try {
    const { data: connections, error } = await supabase
      .from('crm_connections')
      .select('crm_type, sync_enabled, last_sync_at, created_at, updated_at')
      .eq('user_id', req.user.user_id);

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }

    // Get sync stats
    const { data: syncStats } = await supabase
      .from('crm_sync_logs')
      .select('action, status')
      .eq('user_id', req.user.user_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 1000).toISOString());

    const stats = {
      total: syncStats?.length || 0,
      successful: syncStats?.filter(s => s.status === 'success').length || 0,
      failed: syncStats?.filter(s => s.status === 'failed').length || 0
    };

    res.json({
      success: true,
      connected: connections && connections.length > 0,
      connections: connections?.map(c => ({
        crm_type: c.crm_type,
        crm_name: CRM_CONFIG[c.crm_type]?.name || c.crm_type,
        sync_enabled: c.sync_enabled,
        last_sync_at: c.last_sync_at,
        connected_at: c.created_at,
        webhook_url: `${process.env.PUBLIC_URL}/webhooks/crm/${c.crm_type}`
      })) || [],
      sync_stats: stats,
      supported_crms: Object.entries(CRM_CONFIG).map(([key, config]) => ({
        type: key,
        name: config.name,
        webhook_supported: config.webhookSupported
      }))
    });

  } catch (error) {
    console.error('CRM status error:', error);
    res.status(500).json({
      error: 'Failed to get CRM status',
      code: 'STATUS_ERROR',
      details: error.message
    });
  }
}

/**
 * Sync specific lead to CRM
 * POST /api/crm/sync/:leadId
 */
async function syncLead(req, res) {
  try {
    const { leadId } = req.params;

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', req.user.user_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({
        error: 'Lead not found',
        code: 'LEAD_NOT_FOUND'
      });
    }

    // Get user's CRM connections
    const { data: connections, error: connError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('user_id', req.user.user_id)
      .eq('sync_enabled', true);

    if (connError || !connections || connections.length === 0) {
      return res.status(400).json({
        error: 'No CRM connected or sync disabled',
        code: 'NO_CRM_CONNECTED'
      });
    }

    // Sync to each connected CRM
    const results = [];
    for (const connection of connections) {
      const result = await syncLeadToCRM(connection, lead);
      results.push({
        crm_type: connection.crm_type,
        success: result.success,
        crm_contact_id: result.crmContactId,
        error: result.error
      });
    }

    // Update lead sync status
    const allSuccess = results.every(r => r.success);
    await supabase
      .from('leads')
      .update({
        crm_synced: allSuccess,
        crm_synced_at: new Date().toISOString()
      })
      .eq('id', leadId);

    res.json({
      success: true,
      lead_id: leadId,
      sync_results: results
    });

  } catch (error) {
    console.error('Sync lead error:', error);
    res.status(500).json({
      error: 'Failed to sync lead',
      code: 'SYNC_ERROR',
      details: error.message
    });
  }
}

/**
 * Get CRM sync logs
 * GET /api/crm/logs
 */
async function getSyncLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const crmType = req.query.crm_type;

    let query = supabase
      .from('crm_sync_logs')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (crmType) {
      query = query.eq('crm_type', crmType);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch logs: ${error.message}`);
    }

    res.json({
      success: true,
      logs: logs?.map(log => ({
        id: log.id,
        crm_type: log.crm_type,
        lead_id: log.lead_id,
        action: log.action,
        status: log.status,
        error_message: log.error_message,
        created_at: log.created_at
      })) || [],
      count: logs?.length || 0
    });

  } catch (error) {
    console.error('Get sync logs error:', error);
    res.status(500).json({
      error: 'Failed to get sync logs',
      code: 'LOGS_ERROR',
      details: error.message
    });
  }
}

// Helper functions

/**
 * Encrypt API key
 */
function encryptApiKey(apiKey) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!'.slice(0, 32), 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt API key
 */
function decryptApiKey(encryptedKey) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!'.slice(0, 32), 'utf8');
  
  const parts = encryptedKey.split(':');
  if (parts.length !== 3) {
    // Legacy format - return as-is (for migration)
    return encryptedKey;
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Log sync activity
 */
async function logSyncActivity(userId, crmType, leadId, action, status, errorMessage = null, requestPayload = null, responseData = null) {
  try {
    await supabase
      .from('crm_sync_logs')
      .insert({
        user_id: userId,
        crm_type: crmType,
        lead_id: leadId,
        action: action,
        status: status,
        error_message: errorMessage,
        request_payload: requestPayload,
        response_data: responseData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log sync activity:', error);
  }
}

module.exports = {
  connectCRM,
  disconnectCRM,
  getCRMStatus,
  syncLead,
  getSyncLogs,
  CRM_CONFIG,
  encryptApiKey,
  decryptApiKey,
  logSyncActivity
};
