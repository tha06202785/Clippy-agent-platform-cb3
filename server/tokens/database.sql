-- =============================================
-- Token Management System Database Schema
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENCRYPTED TOKENS TABLE
-- Stores encrypted access tokens, refresh tokens, and API keys
-- =============================================

CREATE TABLE IF NOT EXISTS encrypted_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL, -- facebook, google, fub, etc
  token_type VARCHAR(50) NOT NULL, -- access_token, refresh_token, api_key
  encrypted_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one token type per service per user
  CONSTRAINT unique_user_service_token UNIQUE (user_id, service, token_type)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_user_id 
  ON encrypted_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_service 
  ON encrypted_tokens(service);

CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_expires_at 
  ON encrypted_tokens(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_needs_refresh 
  ON encrypted_tokens(expires_at, service, is_active) 
  WHERE expires_at IS NOT NULL AND is_active = true;

-- =============================================
-- TOKEN AUDIT LOG
-- Tracks token operations for security monitoring
-- =============================================

CREATE TABLE IF NOT EXISTS token_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES encrypted_tokens(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  token_type VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- created, refreshed, revoked, accessed, failed_refresh
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_audit_log_user_id 
  ON token_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_token_audit_log_token_id 
  ON token_audit_log(token_id);

CREATE INDEX IF NOT EXISTS idx_token_audit_log_created_at 
  ON token_audit_log(created_at DESC);

-- =============================================
-- AUTO-UPDATE TRIGGER FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_encrypted_tokens_updated_at ON encrypted_tokens;
CREATE TRIGGER update_encrypted_tokens_updated_at
  BEFORE UPDATE ON encrypted_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- AUDIT LOG TRIGGER
-- Automatically log token updates
-- =============================================

CREATE OR REPLACE FUNCTION log_token_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO token_audit_log (token_id, user_id, service, token_type, action, success)
    VALUES (NEW.id, NEW.user_id, NEW.service, NEW.token_type, 'created', true);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if token itself changed (not just is_active)
    IF OLD.encrypted_token != NEW.encrypted_token THEN
      INSERT INTO token_audit_log (token_id, user_id, service, token_type, action, success)
      VALUES (NEW.id, NEW.user_id, NEW.service, NEW.token_type, 'refreshed', true);
    END IF;
    
    -- Log if token was revoked
    IF OLD.is_active = true AND NEW.is_active = false THEN
      INSERT INTO token_audit_log (token_id, user_id, service, token_type, action, success)
      VALUES (NEW.id, NEW.user_id, NEW.service, NEW.token_type, 'revoked', true);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO token_audit_log (token_id, user_id, service, token_type, action, success)
    VALUES (OLD.id, OLD.user_id, OLD.service, OLD.token_type, 'deleted', true);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_token_changes ON encrypted_tokens;
CREATE TRIGGER log_token_changes
  AFTER INSERT OR UPDATE OR DELETE ON encrypted_tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_token_update();

-- =============================================
-- VIEWS FOR MONITORING
-- =============================================

-- View: Tokens expiring soon (next hour)
CREATE OR REPLACE VIEW tokens_expiring_soon AS
SELECT 
  id,
  user_id,
  service,
  token_type,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 AS minutes_until_expiry,
  is_active,
  updated_at
FROM encrypted_tokens
WHERE expires_at IS NOT NULL
  AND expires_at <= NOW() + INTERVAL '1 hour'
  AND is_active = true
ORDER BY expires_at ASC;

-- View: Token statistics by service
CREATE OR REPLACE VIEW token_stats_by_service AS
SELECT 
  service,
  COUNT(*) AS total_tokens,
  COUNT(*) FILTER (WHERE is_active = true) AS active_tokens,
  COUNT(*) FILTER (WHERE is_active = false) AS revoked_tokens,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW() + INTERVAL '1 hour') AS expiring_soon,
  MIN(created_at) AS oldest_token,
  MAX(updated_at) AS most_recent_update
FROM encrypted_tokens
GROUP BY service;

-- =============================================
-- CLEANUP FUNCTION
-- Remove old expired tokens (maintenance)
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM encrypted_tokens
  WHERE expires_at < NOW() - INTERVAL '1 day' * days_old
    AND is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- EXAMPLE QUERIES
-- =============================================

/*
-- Store a new token
INSERT INTO encrypted_tokens (user_id, service, token_type, encrypted_token, expires_at)
VALUES ('user-uuid', 'facebook', 'access_token', 'encrypted-value-here', NOW() + INTERVAL '1 hour');

-- Get active tokens for a user
SELECT service, token_type, expires_at, is_active
FROM encrypted_tokens
WHERE user_id = 'user-uuid' AND is_active = true;

-- Find tokens needing refresh (expires within 5 minutes)
SELECT id, user_id, service, token_type, expires_at
FROM encrypted_tokens
WHERE expires_at IS NOT NULL
  AND expires_at <= NOW() + INTERVAL '5 minutes'
  AND is_active = true;

-- Revoke all tokens for a user
UPDATE encrypted_tokens
SET is_active = false, updated_at = NOW()
WHERE user_id = 'user-uuid';

-- Check audit log
SELECT * FROM token_audit_log
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;

-- Run cleanup (removes tokens expired > 30 days ago)
SELECT cleanup_expired_tokens(30);
*/
