import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "starter", "professional", "agency", "enterprise"]);
export const roleEnum = pgEnum("role", ["owner", "admin", "manager", "agent"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]);
export const listingStatusEnum = pgEnum("listing_status", ["draft", "active", "pending", "sold", "expired", "withdrawn"]);

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
  plan: text("plan").default("free"),
  status: text("status").default("active"),
  start_at: timestamp("start_at").defaultNow(),
  renewal_at: timestamp("renewal_at"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_sub_id: text("stripe_sub_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  user_id: uuid("user_id").primaryKey(),
  full_name: text("full_name"),
  phone: text("phone"),
  avatar_url: text("avatar_url"),
  is_onboarded: boolean("is_onboarded").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
