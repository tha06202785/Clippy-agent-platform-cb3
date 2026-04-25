-- CRM Integration Database Schema
-- Follow Up Boss (FUB), Lofty, Chime support

-- ============================================
-- CRM Connections Table
-- Stores user's CRM API credentials and settings
-- ============================================
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL, -- 'fub', 'lofty', 'chime'
  api_key TEXT NOT NULL,
  webhook_url VARCHAR(500),
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_crm_connections_user_id ON crm_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_connections_crm_type ON crm_connections(crm_type);

-- ============================================
-- CRM Sync Logs Table
-- Tracks all sync activities and errors
-- ============================================
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(50),
  lead_id UUID,
  action VARCHAR(50), -- 'created', 'updated', 'failed', 'deleted'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  request_payload JSONB,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_user_id ON crm_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_lead_id ON crm_sync_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_created_at ON crm_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_action ON crm_sync_logs(action);

-- ============================================
-- CRM Lead Mappings Table
-- Maps local leads to CRM contacts for bidirectional sync
-- ============================================
CREATE TABLE IF NOT EXISTS crm_lead_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL,
  local_lead_id UUID NOT NULL,
  crm_contact_id VARCHAR(255) NOT NULL,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, crm_type, local_lead_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_mappings_user_id ON crm_lead_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_mappings_local_lead_id ON crm_lead_mappings(local_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_mappings_crm_contact_id ON crm_lead_mappings(crm_contact_id);
