-- Clippy Agent Platform - Complete Database Schema
-- Supabase PostgreSQL
-- Generated based on blueprint v1.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- TABLE: orgs
-- Organizations (real estate agencies)
-- =============================================
CREATE TABLE IF NOT EXISTS orgs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    plan TEXT DEFAULT 'free', -- free, starter, pro, enterprise
    market_code TEXT DEFAULT 'AU', -- AU, US, CA
    timezone TEXT DEFAULT 'Australia/Sydney',
    settings_json JSONB DEFAULT '{}',
    logo_url TEXT,
    website_url TEXT,
    billing_email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active', -- active, suspended, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: profiles
-- User profiles (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    voice_dna JSONB DEFAULT '{}', -- Agent's communication style
    notification_prefs JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: user_org_roles
-- Many-to-many: users <-> orgs with roles
-- =============================================
CREATE TABLE IF NOT EXISTS user_org_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'agent', -- owner, admin, agent, assistant
    permissions JSONB DEFAULT '{}',
    is_primary_org BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES profiles(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- =============================================
-- TABLE: listings
-- Property listings
-- =============================================
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    agent_user_id UUID REFERENCES profiles(id),
    
    -- Listing details
    status TEXT DEFAULT 'draft', -- draft, active, under_contract, sold, withdrawn
    type TEXT DEFAULT 'sale', -- sale, rent, commercial
    
    -- Address
    address TEXT NOT NULL,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT NOT NULL,
    country TEXT DEFAULT 'Australia',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Property details
    price_display TEXT, -- e.g. "$850,000 - $920,000"
    price_min INTEGER,
    price_max INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    carspaces INTEGER,
    land_size TEXT,
    building_size TEXT,
    
    -- Features
    features_json JSONB DEFAULT '{}', -- {pool: true, aircon: true, ...}
    description_raw TEXT,
    description_ai TEXT, -- AI-enhanced description
    
    -- Media
    media_urls_json JSONB DEFAULT '[]', -- Array of {url, type, caption}
    featured_image_url TEXT,
    virtual_tour_url TEXT,
    
    -- Source
    source TEXT DEFAULT 'manual', -- manual, domain, realestate.com.au, api
    external_listing_id TEXT,
    
    -- Dates
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    sold_price INTEGER,
    
    -- Metadata
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'under_contract', 'sold', 'withdrawn'))
);

-- =============================================
-- TABLE: leads
-- Potential buyers/sellers
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    -- Contact info
    full_name TEXT,
    email TEXT,
    phone TEXT,
    
    -- Lead details
    status TEXT DEFAULT 'new', -- new, contacted, qualified, inspection_booked, offer_made, converted, lost
    stage TEXT DEFAULT 'prospect', -- prospect, warm, hot, client
    temperature TEXT DEFAULT 'warm', -- hot, warm, cold
    
    -- Buyer profile
    buyer_type TEXT, -- first_home_buyer, investor, upsizer, downsizer, relocator
    budget_min INTEGER,
    budget_max INTEGER,
    preferred_suburbs JSONB DEFAULT '[]',
    requirements_json JSONB DEFAULT '{}', -- {bedrooms: 3, must_haves: [...]}
    
    -- Source
    primary_channel TEXT DEFAULT 'website', -- website, facebook, instagram, referral, manual
    source TEXT, -- specific source like "FB_Lead_Form_Campaign_March"
    source_url TEXT,
    landing_page TEXT,
    utm_params JSONB DEFAULT '{}',
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES profiles(id),
    
    -- Tracking
    notes TEXT,
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    
    -- Linked listing (if inquired about specific property)
    linked_listing_id UUID REFERENCES listings(id),
    
    -- QR/Link tracking
    qr_code_id TEXT,
    
    -- Metadata
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('new', 'contacted', 'qualified', 'inspection_booked', 'offer_made', 'converted', 'lost'))
);

-- =============================================
-- TABLE: lead_identities
-- Multiple contact methods for same lead
-- =============================================
CREATE TABLE IF NOT EXISTS lead_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Identity details
    channel TEXT NOT NULL, -- email, phone, facebook, instagram, whatsapp
    handle TEXT, -- username or handle on platform
    email TEXT,
    phone TEXT,
    external_user_id TEXT, -- Facebook user ID, etc.
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, channel, COALESCE(handle, ''), COALESCE(email, ''), COALESCE(phone, ''))
);

-- =============================================
-- TABLE: lead_events
-- Timeline of all lead interactions
-- =============================================
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    -- allowlist: created, message_received, message_sent, status_changed, 
    --            note_added, task_created, task_done, listing_linked, 
    --            inspection_booked, call_made, email_sent, price_inquiry,
    --            brochure_downloaded, qr_scanned
    
    payload_json JSONB DEFAULT '{}', -- event-specific data
    
    -- AI processing
    ai_processed BOOLEAN DEFAULT false,
    ai_classification TEXT,
    ai_sentiment TEXT,
    
    -- User who triggered (if manual)
    triggered_by_user_id UUID REFERENCES profiles(id),
    
    -- External source
    external_event_id TEXT, -- e.g., Facebook message ID
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_event_type CHECK (
        event_type IN (
            'created', 'message_received', 'message_sent', 'status_changed',
            'note_added', 'task_created', 'task_done', 'listing_linked',
            'inspection_booked', 'call_made', 'email_sent', 'price_inquiry',
            'brochure_downloaded', 'qr_scanned', 'viewed_listing', 'saved_search'
        )
    )
);

-- =============================================
-- TABLE: conversations
-- Message threads with leads
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Channel info
    channel TEXT NOT NULL, -- email, sms, facebook, instagram, whatsapp, web_chat
    external_thread_id TEXT, -- Facebook thread ID, etc.
    
    -- Status
    status TEXT DEFAULT 'active', -- active, archived, spam
    unread_count INTEGER DEFAULT 0,
    
    -- Last activity
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES profiles(id),
    
    -- AI
    ai_draft_reply TEXT,
    ai_draft_generated_at TIMESTAMPTZ,
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: messages
-- Individual messages
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message content
    direction TEXT NOT NULL, -- in, out
    text TEXT NOT NULL,
    text_raw TEXT, -- Original before processing
    
    -- Media
    media_urls_json JSONB DEFAULT '[]',
    
    -- Sender
    sent_by_user_id UUID REFERENCES profiles(id), -- null if from lead
    sent_by_identity_id UUID REFERENCES lead_identities(id), -- null if from agent
    
    -- Status
    status TEXT DEFAULT 'sent', -- draft, sent, delivered, read, failed
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- External
    external_message_id TEXT,
    raw_json JSONB DEFAULT '{}', -- Full webhook payload
    
    -- AI
    ai_generated BOOLEAN DEFAULT false,
    ai_model TEXT,
    ai_prompt_tokens INTEGER,
    ai_completion_tokens INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_direction CHECK (direction IN ('in', 'out'))
);

-- =============================================
-- TABLE: tasks
-- Follow-ups and reminders (planner)
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    -- Links
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Task details
    type TEXT NOT NULL,
    -- allowlist: follow_up_2h, follow_up_24h, follow_up_7d, 
    --            reply_now, book_inspection, send_confirmation, 
    --            post_facebook, post_instagram, generate_content_pack,
    --            price_update, contract_review, handover
    
    title TEXT NOT NULL,
    description TEXT,
    
    -- Scheduling
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled, overdue
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES profiles(id),
    
    -- Execution
    payload_json JSONB DEFAULT '{}', -- task-specific data
    auto_execute BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ,
    execution_result JSONB DEFAULT '{}',
    
    -- Metadata
    created_by_user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_task_type CHECK (
        type IN (
            'follow_up_2h', 'follow_up_24h', 'follow_up_7d',
            'reply_now', 'book_inspection', 'send_confirmation',
            'post_facebook', 'post_instagram', 'generate_content_pack',
            'price_update', 'contract_review', 'handover', 'custom'
        )
    ),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue'))
);

-- =============================================
-- TABLE: content_packs
-- AI-generated marketing content
-- =============================================
CREATE TABLE IF NOT EXISTS content_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Pack details
    pack_type TEXT NOT NULL, -- social_short, social_long, reel_script, story_text, whatsapp, portal, email
    tone TEXT DEFAULT 'professional', -- professional, casual, luxury, friendly
    version INTEGER DEFAULT 1,
    
    -- Content (AI generated)
    content_json JSONB NOT NULL DEFAULT '{}',
    -- {
    --   "caption_short": "...",
    --   "caption_long": "...",
    --   "hashtags": ["..."],
    --   "cta": "...",
    --   "whatsapp": "...",
    --   "reel_script": {"hook": "...", "beats": [...], "close": "..."},
    --   "portal": {"headline": "...", "body": "..."},
    --   "email_subject": "...",
    --   "email_body": "..."
    -- }
    
    -- AI metadata
    ai_model TEXT,
    ai_prompt TEXT,
    tokens_used INTEGER,
    
    -- Approval
    status TEXT DEFAULT 'draft', -- draft, approved, rejected, published
    approved_by_user_id UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Usage
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    created_by_user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: integrations
-- Connected platforms (Facebook, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    provider TEXT NOT NULL, -- facebook_pages, instagram_graph, whatsapp_business, twilio, mailgun
    status TEXT DEFAULT 'pending', -- pending, connected, error, disconnected
    
    -- Credentials (encrypted)
    credentials_encrypted TEXT,
    
    -- Settings
    settings_json JSONB DEFAULT '{}',
    -- e.g. {"page_id": "123", "page_name": "My Real Estate"}
    
    -- Webhook
    webhook_url TEXT,
    webhook_secret TEXT,
    webhook_events JSONB DEFAULT '[]',
    
    -- Stats
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    
    -- Metadata
    connected_by_user_id UUID REFERENCES profiles(id),
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, provider)
);

-- =============================================
-- TABLE: usage_events
-- Audit log for billing/analytics
-- =============================================
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL, -- lead_created, message_sent, ai_request, content_pack_generated
    units INTEGER DEFAULT 1,
    
    meta_json JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: voice_notes
-- Audio recordings for transcription
-- =============================================
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    -- Links
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Storage
    storage_path TEXT NOT NULL, -- Supabase Storage path
    audio_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes INTEGER,
    
    -- Transcription
    transcript_raw TEXT,
    transcript_processed TEXT,
    ai_extracted_facts JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'uploaded', -- uploaded, processing, completed, failed
    error_message TEXT,
    
    created_by_user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES for performance
-- =============================================

-- Orgs
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug);

-- User org roles
CREATE INDEX IF NOT EXISTS idx_user_org_roles_user ON user_org_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_org ON user_org_roles(org_id);

-- Listings
CREATE INDEX IF NOT EXISTS idx_listings_org ON listings(org_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_agent ON listings(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(suburb, state);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- Lead events
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON lead_events(created_at);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Content packs
CREATE INDEX IF NOT EXISTS idx_content_packs_listing ON content_packs(listing_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org_ids
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT org_id FROM user_org_roles
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for orgs
CREATE POLICY orgs_owner_all ON orgs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_org_roles
            WHERE org_id = orgs.id
            AND user_id = auth.uid()
        )
    );

-- Policies for profiles
CREATE POLICY profiles_self ON profiles
    FOR ALL USING (id = auth.uid());

CREATE POLICY profiles_org_visible ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_org_roles
            WHERE user_id = profiles.id
            AND org_id IN (SELECT get_user_org_ids())
        )
    );

-- Policies for user_org_roles
CREATE POLICY user_org_roles_owner ON user_org_roles
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_org_roles_org_visible ON user_org_roles
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for listings
CREATE POLICY listings_org ON listings
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for leads
CREATE POLICY leads_org ON leads
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for lead_events
CREATE POLICY lead_events_org ON lead_events
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for conversations
CREATE POLICY conversations_org ON conversations
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for messages
CREATE POLICY messages_org ON messages
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for tasks
CREATE POLICY tasks_org ON tasks
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for content_packs
CREATE POLICY content_packs_org ON content_packs
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for integrations
CREATE POLICY integrations_org ON integrations
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for usage_events
CREATE POLICY usage_events_org ON usage_events
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Policies for voice_notes
CREATE POLICY voice_notes_org ON voice_notes
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- =============================================
-- TRIGGERS for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON orgs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_packs_updated_at BEFORE UPDATE ON content_packs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_notes_updated_at BEFORE UPDATE ON voice_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS for common queries
-- =============================================

-- View: Active leads with last activity
CREATE OR REPLACE VIEW v_leads_activity AS
SELECT 
    l.*,
    COALESCE(le.last_event_at, l.created_at) as last_activity_at,
    le.event_count,
    c.unread_count as unread_messages
FROM leads l
LEFT JOIN (
    SELECT lead_id, MAX(created_at) as last_event_at, COUNT(*) as event_count
    FROM lead_events
    GROUP BY lead_id
) le ON le.lead_id = l.id
LEFT JOIN conversations c ON c.lead_id = l.id
WHERE l.status NOT IN ('converted', 'lost');

-- View: Today's tasks
CREATE OR REPLACE VIEW v_today_tasks AS
SELECT t.*, l.full_name as lead_name, li.address as listing_address
FROM tasks t
LEFT JOIN leads l ON l.id = t.lead_id
LEFT JOIN listings li ON li.id = t.listing_id
WHERE DATE(t.due_at) = CURRENT_DATE
AND t.status IN ('pending', 'in_progress');

-- =============================================
-- DONE!
-- =============================================

SELECT 'Clippy Agent Platform database schema created successfully!' as status;
