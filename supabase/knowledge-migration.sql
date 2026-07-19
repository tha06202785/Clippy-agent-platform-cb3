-- Clippy Knowledge Base System - Database Migration
-- Run this in Supabase SQL Editor to create all knowledge tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Layer Types
DO 128760 BEGIN
  CREATE TYPE knowledge_layer AS ENUM (
    'real_estate_shared',
    'agency_private',
    'agent_private',
    'client_memory'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END 128760;

DO 128760 BEGIN
  CREATE TYPE knowledge_status AS ENUM (
    'pending',
    'indexed',
    'processing',
    'failed',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END 128760;

DO 128760 BEGIN
  CREATE TYPE knowledge_source AS ENUM (
    'upload',
    'email',
    'calendar',
    'crm',
    'conversation',
    'voice_note',
    'meeting_note',
    'inspection_report',
    'rental_application',
    'listing',
    'template',
    'website',
    'manual_entry',
    'learned_correction'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END 128760;

-- Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  layer text NOT NULL,
  user_id uuid,
  client_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  source text NOT NULL,
  source_metadata jsonb,
  embedding_model text DEFAULT 'text-embedding-3-small',
  embedding_version integer DEFAULT 1,
  status text DEFAULT 'pending' NOT NULL,
  health text DEFAULT 'healthy',
  word_count integer,
  chunk_count integer,
  tags jsonb,
  categories jsonb,
  is_public boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  version integer DEFAULT 1,
  parent_id uuid,
  superseded_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  indexed_at timestamptz,
  last_accessed_at timestamptz
);

-- Knowledge Chunks Table (for RAG)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding jsonb,
  metadata jsonb,
  relevance_score integer DEFAULT 0,
  access_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Agent Profiles Table
CREATE TABLE IF NOT EXISTS agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  org_id uuid NOT NULL,
  writing_style jsonb,
  preferred_greetings jsonb,
  negotiation_style text,
  follow_up_habits jsonb,
  communication_tone text,
  favourite_templates jsonb,
  frequently_used_suburbs jsonb,
  working_hours jsonb,
  preferred_communication text,
  confidence_score integer DEFAULT 50,
  corrections_made integer DEFAULT 0,
  suggestions_accepted integer DEFAULT 0,
  suggestions_rejected integer DEFAULT 0,
  voice_style text,
  personality_traits jsonb,
  status text DEFAULT 'learning' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_trained_at timestamptz
);

-- Client Memories Table
CREATE TABLE IF NOT EXISTS client_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE,
  org_id uuid NOT NULL,
  property_interests jsonb,
  budget_min integer,
  budget_max integer,
  family_requirements jsonb,
  pets jsonb,
  preferred_suburbs jsonb,
  must_have_features jsonb,
  deal_breakers jsonb,
  buying_stage text,
  rental_stage text,
  inspection_history jsonb,
  viewing_notes text,
  communication_preference text,
  best_contact_time text,
  important_dates jsonb,
  applications jsonb,
  offers jsonb,
  follow_up_history jsonb,
  conversation_highlights jsonb,
  sentiment_timeline jsonb,
  engagement_score integer DEFAULT 50,
  memory_version integer DEFAULT 1,
  last_updated_by text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Clippy Corrections (Teach Clippy)
CREATE TABLE IF NOT EXISTS clippy_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  original_response text NOT NULL,
  correction_type text NOT NULL,
  user_feedback text NOT NULL,
  applied_to text NOT NULL,
  guidance_text text NOT NULL,
  examples jsonb,
  status text DEFAULT 'pending' NOT NULL,
  approved_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  applied_at timestamptz
);

-- Integration Health
CREATE TABLE IF NOT EXISTS integration_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  items_indexed integer DEFAULT 0,
  sync_duration_ms integer,
  errors_count integer DEFAULT 0,
  warnings_count integer DEFAULT 0,
  last_error text,
  last_warning text,
  permissions jsonb,
  activity_summary jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Onboarding Progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE,
  current_phase text DEFAULT 'welcome' NOT NULL,
  completed_phases jsonb DEFAULT '[]',
  profile_completed boolean DEFAULT false,
  integrations_completed boolean DEFAULT false,
  import_completed boolean DEFAULT false,
  knowledge_built boolean DEFAULT false,
  time_spent_seconds integer DEFAULT 0,
  integrations_connected integer DEFAULT 0,
  documents_uploaded integer DEFAULT 0,
  knowledge_items integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activity Log
CREATE TABLE IF NOT EXISTS clippy_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb,
  impact_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_org ON knowledge_documents(org_id, layer, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user ON agent_profiles(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_client_memories_lead ON client_memories(lead_id, org_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_org ON integration_health(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_activity_log_org ON clippy_activity_log(org_id, created_at DESC);

-- RLS Policies (enable row level security)
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clippy_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE clippy_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_documents
CREATE POLICY "Org members can view knowledge documents"
  ON knowledge_documents FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert knowledge documents"
  ON knowledge_documents FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can update knowledge documents"
  ON knowledge_documents FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- RLS Policies for agent_profiles
CREATE POLICY "Users can view own profile"
  ON agent_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON agent_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Org can insert agent profiles"
  ON agent_profiles FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- RLS Policies for client_memories
CREATE POLICY "Org members can view client memories"
  ON client_memories FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert client memories"
  ON client_memories FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can update client memories"
  ON client_memories FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Org members can view integration health"
  ON integration_health FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert integration health"
  ON integration_health FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can update integration health"
  ON integration_health FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can view activity log"
  ON clippy_activity_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert activity log"
  ON clippy_activity_log FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can view onboarding progress"
  ON onboarding_progress FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can update onboarding progress"
  ON onboarding_progress FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert onboarding progress"
  ON onboarding_progress FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can view clippy corrections"
  ON clippy_corrections FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert clippy corrections"
  ON clippy_corrections FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can update clippy corrections"
  ON clippy_corrections FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Upsert function for integrations
CREATE OR REPLACE FUNCTION upsert_integration(
  p_org_id uuid,
  p_provider text,
  p_status text,
  p_credentials jsonb,
  p_connected_at timestamptz,
  p_page_id text DEFAULT ''
)
RETURNS void AS 128760
BEGIN
  INSERT INTO integrations (org_id, provider, status, credentials_encrypted, connected_at, settings_json)
  VALUES (p_org_id, p_provider, p_status, p_credentials, p_connected_at, 
          CASE WHEN p_page_id != '' THEN jsonb_build_object('facebook_page_id', p_page_id) ELSE '{}'::jsonb END)
  ON CONFLICT (org_id, provider) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    credentials_encrypted = EXCLUDED.credentials_encrypted,
    connected_at = EXCLUDED.connected_at,
    settings_json = EXCLUDED.settings_json,
    updated_at = now();
END;
128760 LANGUAGE plpgsql;
