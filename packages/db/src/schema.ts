import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, doublePrecision, pgEnum } from "drizzle-orm/pg-core";

// ─── Existing enums ───
export const planEnum = pgEnum("plan", ["free", "starter", "professional", "agency", "enterprise"]);
export const roleEnum = pgEnum("role", ["owner", "admin", "manager", "agent"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]);
export const listingStatusEnum = pgEnum("listing_status", ["draft", "active", "pending", "sold", "expired", "withdrawn"]);

// ─── New enums for AI brain ───
export const leadStageEnum = pgEnum("lead_stage", ["unknown", "new", "warm", "hot", "inspection_booked", "offer", "negotiation", "contract", "won", "lost", "nurture"]);
export const channelEnum = pgEnum("channel", ["website", "facebook", "facebook_comment", "whatsapp", "email", "sms", "instagram", "realestate", "domain", "phone", "manual"]);
export const sentimentEnum = pgEnum("sentiment", ["positive", "neutral", "negative", "angry"]);
export const aiActionTypeEnum = pgEnum("ai_action_type", ["reply", "escalate", "follow_up", "book_inspection", "schedule_call", "collect_info", "nurture", "stop"]);

// ─── Existing tables ───
export const orgs = pgTable("orgs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  plan: text("plan").default("free").notNull(),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_sub_id: text("stripe_sub_id"),
  settings_json: jsonb("settings_json"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const org_members = pgTable("org_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  user_id: uuid("user_id").notNull(),
  role: text("role").default("agent").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  full_name: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  source: text("source").default("manual"),
  status: text("status").default("new"),
  stage: text("stage").default("inquiry"),
  assigned_to_user_id: uuid("assigned_to_user_id"),
  ai_score: integer("ai_score"),
  priority: text("priority").default("medium"),
  notes: text("notes"),
  buyer_type: text("buyer_type"),
  external_id: text("external_id"),
  source_data: jsonb("source_data"),
  last_contact_at: timestamp("last_contact_at"),
  last_activity_at: timestamp("last_activity_at"),
  loss_reason: text("loss_reason"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  address: text("address").notNull(),
  price: text("price"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  property_type: text("property_type"),
  status: text("status").default("active"),
  description: text("description"),
  features: jsonb("features"),
  images: jsonb("images"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const briefings = pgTable("briefings", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  title: text("title").notNull(),
  date: timestamp("date").defaultNow(),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  provider: text("provider").notNull(),
  status: text("status").default("disconnected"),
  credentials_encrypted: text("credentials_encrypted"),
  settings_json: jsonb("settings_json"),
  connected_at: timestamp("connected_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  plan: text("plan").notNull(),
  status: text("status").default("active"),
  stripe_subscription_id: text("stripe_subscription_id"),
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").unique().notNull(),
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  phone: text("phone"),
  role: text("role").default("agent"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── NEW: AI Brain Tables ───

// Conversations - one per lead per channel
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id),
  channel: text("channel").notNull(),
  external_conversation_id: text("external_conversation_id"),
  status: text("status").default("active"),
  lead_stage: text("lead_stage").default("unknown"),
  automation_mode: text("automation_mode").default("autonomous"),
  taken_over_by: uuid("taken_over_by"),
  taken_over_at: timestamp("taken_over_at"),
  resume_at: timestamp("resume_at"),
  message_count: integer("message_count").default(0),
  last_message_at: timestamp("last_message_at"),
  summary: text("summary"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Individual messages in a conversation
export const conversation_messages = pgTable("conversation_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversation_id: uuid("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // "lead", "ai", "agent"
  content: text("content").notNull(),
  channel: text("channel"),
  external_message_id: text("external_message_id"),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  sentiment: text("sentiment"),
  ai_confidence: doublePrecision("ai_confidence"),
  ai_action: text("ai_action"),
  created_at: timestamp("created_at").defaultNow(),
});

// Lead memory - enriched CRM data extracted by AI
export const lead_memory = pgTable("lead_memory", {
  id: uuid("id").defaultRandom().primaryKey(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull().unique(),
  budget_min: doublePrecision("budget_min"),
  budget_max: doublePrecision("budget_max"),
  bedrooms_min: integer("bedrooms_min"),
  bathrooms_min: integer("bathrooms_min"),
  parking_min: integer("parking_min"),
  preferred_suburbs: jsonb("preferred_suburbs"),
  school_needs: text("school_needs"),
  has_pets: boolean("has_pets"),
  is_investment: boolean("is_investment"),
  finance_approved: boolean("finance_approved"),
  finance_status: text("finance_status"),
  timeline: text("timeline"),
  reason_for_moving: text("reason_for_moving"),
  partner_name: text("partner_name"),
  children_info: text("children_info"),
  preferred_contact: text("preferred_contact"),
  inspection_times: text("inspection_times"),
  previous_objections: jsonb("previous_objections"),
  buying_motivation: text("buying_motivation"),
  notes: text("notes"),
  last_updated: timestamp("last_updated").defaultNow(),
});

// Lead stage history
export const lead_stage_history = pgTable("lead_stage_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull(),
  from_stage: text("from_stage"),
  to_stage: text("to_stage").notNull(),
  reason: text("reason"),
  triggered_by: text("triggered_by").default("ai"),
  created_at: timestamp("created_at").defaultNow(),
});

// Lead scores computed by AI
export const lead_scores = pgTable("lead_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull().unique(),
  buying_readiness: doublePrecision("buying_readiness"),
  likelihood_to_inspect: doublePrecision("likelihood_to_inspect"),
  probability_of_purchase: doublePrecision("probability_of_purchase"),
  urgency: doublePrecision("urgency"),
  sentiment_score: doublePrecision("sentiment_score"),
  engagement_score: doublePrecision("engagement_score"),
  last_computed: timestamp("last_computed").defaultNow(),
});

// Follow-up queue
export const followup_queue = pgTable("followup_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull(),
  conversation_id: uuid("conversation_id").references(() => conversations.id),
  action_type: text("action_type").notNull(),
  scheduled_for: timestamp("scheduled_for").notNull(),
  context: jsonb("context"),
  status: text("status").default("pending"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// AI actions log
export const ai_actions = pgTable("ai_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id),
  conversation_id: uuid("conversation_id").references(() => conversations.id),
  action_type: text("action_type").notNull(),
  input_summary: text("input_summary"),
  output_summary: text("output_summary"),
  confidence: doublePrecision("confidence"),
  latency_ms: integer("latency_ms"),
  tokens_used: integer("tokens_used"),
  escalated: boolean("escalated").default(false),
  escalation_reason: text("escalation_reason"),
  created_at: timestamp("created_at").defaultNow(),
});

// Escalations to human agents
export const escalations = pgTable("escalations", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id),
  conversation_id: uuid("conversation_id").references(() => conversations.id),
  reason: text("reason").notNull(),
  severity: text("severity").default("medium"),
  status: text("status").default("pending"),
  assigned_to_user_id: uuid("assigned_to_user_id"),
  resolved_at: timestamp("resolved_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Agent voice profiles
export const agent_voice = pgTable("agent_voice", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull().unique(),
  name: text("name").default("Professional"),
  tone: text("tone").default("warm"),
  style_guide: text("style_guide"),
  greeting_template: text("greeting_template"),
  signature: text("signature"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Daily AI summaries for agents
export const ai_summaries = pgTable("ai_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  date: timestamp("date").notNull(),
  conversations_handled: integer("conversations_handled").default(0),
  inspections_booked: integer("inspections_booked").default(0),
  hot_leads_identified: integer("hot_leads_identified").default(0),
  escalations_count: integer("escalations_count").default(0),
  pipeline_value: doublePrecision("pipeline_value"),
  summary_text: text("summary_text"),
  created_at: timestamp("created_at").defaultNow(),
});

// Compliance logs
export const compliance_logs = pgTable("compliance_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  message_id: uuid("message_id").references(() => conversation_messages.id),
  check_type: text("check_type").notNull(),
  passed: boolean("passed").notNull(),
  details: text("details"),
  created_at: timestamp("created_at").defaultNow(),
});

// Lead identities - cross-channel identity resolution
export const lead_identities = pgTable("lead_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull(),
  channel: text("channel").notNull(),
  external_id: text("external_id"),
  email_normalized: text("email_normalized"),
  phone_e164: text("phone_e164"),
  facebook_psid: text("facebook_psid"),
  instagram_id: text("instagram_id"),
  whatsapp_id: text("whatsapp_id"),
  domain_enquiry_id: text("domain_enquiry_id"),
  verified_at: timestamp("verified_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── NEW: Security & Operations Tables ───

// Raw webhook events - preserve for replay
export const webhook_events = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id),
  channel: text("channel").notNull(),
  event_type: text("event_type").notNull(),
  raw_payload: jsonb("raw_payload").notNull(),
  headers: jsonb("headers"),
  processed: boolean("processed").default(false),
  processing_result: text("processing_result"),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow(),
});

// Authoritative listing facts - AI source of truth
export const listing_facts = pgTable("listing_facts", {
  id: uuid("id").defaultRandom().primaryKey(),
  listing_id: uuid("listing_id").references(() => listings.id).notNull().unique(),
  verified_price: text("verified_price"),
  verified_bedrooms: integer("verified_bedrooms"),
  verified_bathrooms: integer("verified_bathrooms"),
  verified_land_size: text("verified_land_size"),
  verified_building_size: text("verified_building_size"),
  verified_inspection_times: jsonb("verified_inspection_times"),
  verified_availability: text("verified_availability"),
  school_zones: jsonb("school_zones"),
  nearby_amenities: jsonb("nearby_amenities"),
  source: text("source").default("agent"),
  last_verified_at: timestamp("last_verified_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Opt-outs - prevent messaging unsubscribed leads
export const opt_outs = pgTable("opt_outs", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id),
  channel: text("channel"),
  email: text("email"),
  phone: text("phone"),
  reason: text("reason"),
  opted_out_at: timestamp("opted_out_at").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
});

// Consent events - track when/how consent was given
export const consent_events = pgTable("consent_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id),
  channel: text("channel").notNull(),
  consent_type: text("consent_type").notNull(),
  granted: boolean("granted").notNull(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").defaultNow(),
});

// Message delivery attempts - retry tracking
export const message_delivery_attempts = pgTable("message_delivery_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  message_id: uuid("message_id").references(() => conversation_messages.id),
  channel: text("channel").notNull(),
  status: text("status").default("pending"),
  attempt_count: integer("attempt_count").default(0),
  max_attempts: integer("max_attempts").default(3),
  last_error: text("last_error"),
  idempotency_key: text("idempotency_key").unique(),
  next_retry_at: timestamp("next_retry_at"),
  delivered_at: timestamp("delivered_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Inspection bookings
export const inspection_bookings = pgTable("inspection_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull(),
  listing_id: uuid("listing_id").references(() => listings.id).notNull(),
  scheduled_at: timestamp("scheduled_at").notNull(),
  status: text("status").default("pending"),
  attendees: integer("attendees").default(1),
  notes: text("notes"),
  confirmed_by_lead: boolean("confirmed_by_lead").default(false),
  confirmed_at: timestamp("confirmed_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});


// ─── RENTAL INSPECTION PIPELINE ───

// Inspection time slots - agent-defined available times
export const inspection_time_slots = pgTable("inspection_time_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  listing_id: uuid("listing_id").references(() => listings.id).notNull(),
  starts_at: timestamp("starts_at").notNull(),
  ends_at: timestamp("ends_at").notNull(),
  timezone: text("timezone").default("Australia/Sydney"),
  inspection_type: text("inspection_type").default("open_home"),
  capacity: integer("capacity").default(10),
  booking_count: integer("booking_count").default(0),
  status: text("status").default("published"),
  location_notes: text("location_notes"),
  host_user_id: uuid("host_user_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Inspection bookings - one per lead per slot
export const inspection_bookings = pgTable("inspection_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  slot_id: uuid("slot_id").references(() => inspection_time_slots.id),
  listing_id: uuid("listing_id").references(() => listings.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull(),
  conversation_id: uuid("conversation_id").references(() => conversations.id),
  booking_status: text("booking_status").default("reserved"),
  attendance_status: text("attendance_status").default("unknown"),
  attendee_count: integer("attendee_count").default(1),
  confirmation_sent_at: timestamp("confirmation_sent_at"),
  cancelled_at: timestamp("cancelled_at"),
  cancellation_reason: text("cancellation_reason"),
  checked_in_at: timestamp("checked_in_at"),
  source_channel: text("source_channel").default("website"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Rental applications - separate from inspection_bookings
export const rental_applications = pgTable("rental_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  listing_id: uuid("listing_id").references(() => listings.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull(),
  inspection_booking_id: uuid("inspection_booking_id").references(() => inspection_bookings.id),
  external_provider: text("external_provider"),
  external_application_id: text("external_application_id"),
  application_url: text("application_url"),
  status: text("status").default("not_started"),
  submitted_at: timestamp("submitted_at"),
  reviewed_at: timestamp("reviewed_at"),
  decision_recorded_by: uuid("decision_recorded_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Scheduled communications - durable job queue for reminders
export const scheduled_communications = pgTable("scheduled_communications", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id),
  conversation_id: uuid("conversation_id").references(() => conversations.id),
  inspection_booking_id: uuid("inspection_booking_id").references(() => inspection_bookings.id),
  type: text("type").notNull(),
  channel: text("channel").default("email"),
  scheduled_for: timestamp("scheduled_for").notNull(),
  status: text("status").default("scheduled"),
  attempt_count: integer("attempt_count").default(0),
  max_attempts: integer("max_attempts").default(3),
  idempotency_key: text("idempotency_key").unique(),
  sent_at: timestamp("sent_at"),
  cancelled_at: timestamp("cancelled_at"),
  last_error: text("last_error"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Lead channel preferences - opt-out, quiet hours, consent
export const lead_channel_preferences = pgTable("lead_channel_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  org_id: uuid("org_id").references(() => orgs.id).notNull(),
  lead_id: uuid("lead_id").references(() => leads.id).notNull().unique(),
  email_consent: boolean("email_consent").default(true),
  sms_consent: boolean("sms_consent").default(true),
  whatsapp_consent: boolean("whatsapp_consent").default(true),
  phone_consent: boolean("phone_consent").default(true),
  transactional_allowed: boolean("transactional_allowed").default(true),
  marketing_allowed: boolean("marketing_allowed").default(false),
  preferred_channel: text("preferred_channel").default("email"),
  quiet_hours_start: text("quiet_hours_start"),
  quiet_hours_end: text("quiet_hours_end"),
  opted_out_at: timestamp("opted_out_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
