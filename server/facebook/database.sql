-- Facebook Integration Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FACEBOOK CONNECTIONS TABLE
-- Stores connected Facebook Pages for each user
-- ============================================
CREATE TABLE IF NOT EXISTS facebook_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    page_name VARCHAR(255),
    page_access_token TEXT NOT NULL,
    instagram_account_id VARCHAR(255),
    webhook_subscribed BOOLEAN DEFAULT false,
    auto_reply_enabled BOOLEAN DEFAULT true,
    auto_post_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, page_id)
);

-- Index for faster lookups
CREATE INDEX idx_facebook_connections_user_id ON facebook_connections(user_id);
CREATE INDEX idx_facebook_connections_page_id ON facebook_connections(page_id);

-- ============================================
-- FACEBOOK LEADS TABLE
-- Stores real leads from Facebook Lead Ads
-- ============================================
CREATE TABLE IF NOT EXISTS facebook_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    facebook_lead_id VARCHAR(255) UNIQUE NOT NULL,
    page_id VARCHAR(255),
    form_id VARCHAR(255),
    form_name VARCHAR(255),
    field_data JSONB DEFAULT '{}', -- name, email, phone, custom questions
    campaign_id VARCHAR(255),
    ad_id VARCHAR(255),
    created_time TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT false,
    synced_to_crm BOOLEAN DEFAULT false,
    ai_qualified BOOLEAN DEFAULT false,
    ai_qualification_result JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_facebook_leads_user_id ON facebook_leads(user_id);
CREATE INDEX idx_facebook_leads_page_id ON facebook_leads(page_id);
CREATE INDEX idx_facebook_leads_facebook_lead_id ON facebook_leads(facebook_lead_id);
CREATE INDEX idx_facebook_leads_created_time ON facebook_leads(created_time);
CREATE INDEX idx_facebook_leads_processed ON facebook_leads(processed);

-- ============================================
-- FACEBOOK MESSAGES TABLE
-- Stores Messenger conversations
-- ============================================
CREATE TABLE IF NOT EXISTS facebook_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    message TEXT,
    message_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_from_page BOOLEAN DEFAULT false,
    ai_reply_sent BOOLEAN DEFAULT false,
    ai_reply_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversation lookups
CREATE INDEX idx_facebook_messages_user_id ON facebook_messages(user_id);
CREATE INDEX idx_facebook_messages_sender_id ON facebook_messages(sender_id);
CREATE INDEX idx_facebook_messages_timestamp ON facebook_messages(timestamp);
CREATE INDEX idx_facebook_messages_conversation ON facebook_messages(user_id, sender_id);

-- ============================================
-- FACEBOOK POSTS TABLE
-- Stores scheduled and published posts
-- ============================================
CREATE TABLE IF NOT EXISTS facebook_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    post_id VARCHAR(255), -- Facebook's post ID after publishing
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    link_url VARCHAR(1000),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, published, failed, draft
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for post management
CREATE INDEX idx_facebook_posts_user_id ON facebook_posts(user_id);
CREATE INDEX idx_facebook_posts_page_id ON facebook_posts(page_id);
CREATE INDEX idx_facebook_posts_status ON facebook_posts(status);
CREATE INDEX idx_facebook_posts_scheduled ON facebook_posts(scheduled_at);

-- ============================================
-- FACEBOOK WEBHOOK EVENTS LOG
-- For debugging and audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS facebook_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    page_id VARCHAR(255),
    payload JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for event processing
CREATE INDEX idx_facebook_webhook_events_created ON facebook_webhook_events(created_at);
CREATE INDEX idx_facebook_webhook_events_type ON facebook_webhook_events(event_type);
CREATE INDEX idx_facebook_webhook_events_processed ON facebook_webhook_events(processed);

-- ============================================
-- TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to facebook_connections
DROP TRIGGER IF EXISTS update_facebook_connections_updated_at ON facebook_connections;
CREATE TRIGGER update_facebook_connections_updated_at
    BEFORE UPDATE ON facebook_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own facebook_connections" 
    ON facebook_connections FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facebook_connections" 
    ON facebook_connections FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facebook_connections" 
    ON facebook_connections FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own facebook_connections" 
    ON facebook_connections FOR DELETE 
    USING (auth.uid() = user_id);

-- Same policies for facebook_leads
CREATE POLICY "Users can view own facebook_leads" 
    ON facebook_leads FOR SELECT 
    USING (auth.uid() = user_id);

-- Same policies for facebook_messages
CREATE POLICY "Users can view own facebook_messages" 
    ON facebook_messages FOR SELECT 
    USING (auth.uid() = user_id);

-- Same policies for facebook_posts
CREATE POLICY "Users can view own facebook_posts" 
    ON facebook_posts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facebook_posts" 
    ON facebook_posts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facebook_posts" 
    ON facebook_posts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own facebook_posts" 
    ON facebook_posts FOR DELETE 
    USING (auth.uid() = user_id);

-- Webhook events only viewable by service role
CREATE POLICY "Service role can manage webhook events" 
    ON facebook_webhook_events FOR ALL 
    USING (false);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE facebook_connections IS 'Stores Facebook Page connections for each user';
COMMENT ON TABLE facebook_leads IS 'Real leads captured from Facebook Lead Ads';
COMMENT ON TABLE facebook_messages IS 'Messenger conversations with leads';
COMMENT ON TABLE facebook_posts IS 'Scheduled and published Facebook posts';
COMMENT ON TABLE facebook_webhook_events IS 'Audit log for Facebook webhook events';

-- ============================================
-- VIEW FOR LEADS DASHBOARD
-- ============================================
CREATE OR REPLACE VIEW facebook_leads_summary AS
SELECT 
    user_id,
    DATE(created_time) as lead_date,
    COUNT(*) as total_leads,
    SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed_leads,
    SUM(CASE WHEN ai_qualified THEN 1 ELSE 0 END) as qualified_leads,
    SUM(CASE WHEN synced_to_crm THEN 1 ELSE 0 END) as crm_synced_leads
FROM facebook_leads
GROUP BY user_id, DATE(created_time)
ORDER BY lead_date DESC;

-- Grant permissions
GRANT SELECT ON facebook_leads_summary TO authenticated;