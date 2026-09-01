/**
 * Clippy Knowledge Base System - Database Schema
 * 4 Layers: Real Estate (shared), Agency, Agent, Client Memory
 */

import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

// Knowledge Layer Types
export const knowledgeLayerEnum = pgEnum("knowledge_layer", [
  "real_estate_shared",    // Layer 1: Clippy-maintained real estate knowledge
  "agency_private",        // Layer 2: Agency-specific knowledge
  "agent_private",         // Layer 3: Individual agent preferences
  "client_memory"          // Layer 4: Client/lead timeline
]);

export const knowledgeStatusEnum = pgEnum("knowledge_status", [
  "pending",
  "indexed",
  "processing",
  "failed",
  "archived"
]);

export const knowledgeSourceEnum = pgEnum("knowledge_source", [
  "upload",
  "email",
  "calendar",
  "crm",
  "conversation",
  "voice_note",
  "meeting_note",
  "inspection_report",
  "rental_application",
  "listing",
  "template",
  "website",
  "manual_entry",
  "learned_correction"
]);

// Knowledge Documents (all 4 layers)
export const knowledge_documents = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").notNull(),
  layer: text("layer").notNull(),
  user_id: uuid("user_id"),
  client_id: uuid("client_id"),
  integration_account_id: uuid("integration_account_id"),
  
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  
  source: text("source").notNull(),
  source_metadata: jsonb("source_metadata"),
  
  embedding_model: text("embedding_model").default("text-embedding-3-small"),
  embedding_version: integer("embedding_version").default(1),
  
  status: text("status").default("pending").notNull(),
  health: text("health").default("healthy"),
  
  word_count: integer("word_count"),
  chunk_count: integer("chunk_count"),
  
  tags: jsonb("tags"),
  categories: jsonb("categories"),
  
  is_public: boolean("is_public").default(false),
  requires_approval: boolean("requires_approval").default(false),
  approved_by: uuid("approved_by"),
  approved_at: timestamp("approved_at"),
  
  version: integer("version").default(1),
  parent_id: uuid("parent_id"),
  superseded_by: uuid("superseded_by"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  indexed_at: timestamp("indexed_at"),
  last_accessed_at: timestamp("last_accessed_at"),
});

// Knowledge Chunks (for RAG retrieval)
export const knowledge_chunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  document_id: uuid("document_id").notNull().references(() => knowledge_documents.id),
  chunk_index: integer("chunk_index").notNull(),
  
  content: text("content").notNull(),
  embedding: jsonb("embedding"),
  
  metadata: jsonb("metadata"),
  relevance_score: integer("relevance_score").default(0),
  access_count: integer("access_count").default(0),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Agent AI Profiles (Layer 3 metadata)
export const agent_profiles = pgTable("agent_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().unique(),
  org_id: uuid("org_id").notNull(),
  
  writing_style: jsonb("writing_style"),
  preferred_greetings: jsonb("preferred_greetings"),
  negotiation_style: text("negotiation_style"),
  follow_up_habits: jsonb("follow_up_habits"),
  communication_tone: text("communication_tone"),
  
  favourite_templates: jsonb("favourite_templates"),
  frequently_used_suburbs: jsonb("frequently_used_suburbs"),
  working_hours: jsonb("working_hours"),
  preferred_communication: text("preferred_communication"),
  
  confidence_score: integer("confidence_score").default(50),
  corrections_made: integer("corrections_made").default(0),
  suggestions_accepted: integer("suggestions_accepted").default(0),
  suggestions_rejected: integer("suggestions_rejected").default(0),
  
  voice_style: text("voice_style"),
  personality_traits: jsonb("personality_traits"),
  
  status: text("status").default("learning").notNull(),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_trained_at: timestamp("last_trained_at"),
});

// Client Memory Timeline (Layer 4)
export const client_memories = pgTable("client_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  lead_id: uuid("lead_id").notNull().unique(),
  org_id: uuid("org_id").notNull(),
  
  property_interests: jsonb("property_interests"),
  budget_min: integer("budget_min"),
  budget_max: integer("budget_max"),
  family_requirements: jsonb("family_requirements"),
  pets: jsonb("pets"),
  preferred_suburbs: jsonb("preferred_suburbs"),
  must_have_features: jsonb("must_have_features"),
  deal_breakers: jsonb("deal_breakers"),
  
  buying_stage: text("buying_stage"),
  rental_stage: text("rental_stage"),
  inspection_history: jsonb("inspection_history"),
  viewing_notes: text("viewing_notes"),
  
  communication_preference: text("communication_preference"),
  best_contact_time: text("best_contact_time"),
  important_dates: jsonb("important_dates"),
  
  applications: jsonb("applications"),
  offers: jsonb("offers"),
  follow_up_history: jsonb("follow_up_history"),
  
  conversation_highlights: jsonb("conversation_highlights"),
  sentiment_timeline: jsonb("sentiment_timeline"),
  engagement_score: integer("engagement_score").default(50),
  
  memory_version: integer("memory_version").default(1),
  last_updated_by: text("last_updated_by"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Teach Clippy Feedback
export const clippy_corrections = pgTable("clippy_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").notNull(),
  user_id: uuid("user_id").notNull(),
  
  original_response: text("original_response").notNull(),
  correction_type: text("correction_type").notNull(),
  user_feedback: text("user_feedback").notNull(),
  
  applied_to: text("applied_to").notNull(),
  guidance_text: text("guidance_text").notNull(),
  
  examples: jsonb("examples"),
  status: text("status").default("pending").notNull(),
  approved_by: uuid("approved_by"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  applied_at: timestamp("applied_at"),
});

// Integration Health Monitoring
export const integration_health = pgTable("integration_health", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").notNull(),
  provider: text("provider").notNull(),
  
  status: text("status").notNull(),
  last_sync_at: timestamp("last_sync_at"),
  next_sync_at: timestamp("next_sync_at"),
  
  items_indexed: integer("items_indexed").default(0),
  sync_duration_ms: integer("sync_duration_ms"),
  errors_count: integer("errors_count").default(0),
  warnings_count: integer("warnings_count").default(0),
  
  last_error: text("last_error"),
  last_warning: text("last_warning"),
  permissions: jsonb("permissions"),
  
  activity_summary: jsonb("activity_summary"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Onboarding Progress Tracking
export const onboarding_progress = pgTable("onboarding_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").notNull().unique(),
  
  current_phase: text("current_phase").default("welcome").notNull(),
  completed_phases: jsonb("completed_phases").default([]),
  
  profile_completed: boolean("profile_completed").default(false),
  integrations_completed: boolean("integrations_completed").default(false),
  import_completed: boolean("import_completed").default(false),
  knowledge_built: boolean("knowledge_built").default(false),
  
  time_spent_seconds: integer("time_spent_seconds").default(0),
  integrations_connected: integer("integrations_connected").default(0),
  documents_uploaded: integer("documents_uploaded").default(0),
  knowledge_items: integer("knowledge_items").default(0),
  
  completed_at: timestamp("completed_at"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Timeline
export const clippy_activity_log = pgTable("clippy_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").notNull(),
  user_id: uuid("user_id"),
  
  action: text("action").notNull(),
  category: text("category").notNull(),
  
  title: text("title").notNull(),
  description: text("description"),
  
  metadata: jsonb("metadata"),
  impact_summary: text("impact_summary"),
  
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
});
