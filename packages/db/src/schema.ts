import { pgTable, uuid, text, integer, timestamp, boolean, numeric, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  planId: text("plan_id").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  aiRepliesUsed: integer("ai_replies_used").default(0),
  aiRepliesLimit: integer("ai_replies_limit").default(50),
  listingsUsed: integer("listings_used").default(0),
  listingsLimit: integer("listings_limit").default(5),
  leadsUsed: integer("leads_used").default(0),
  leadsLimit: integer("leads_limit").default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  source: text("source").default("manual"),
  status: text("status").default("new"),
  stage: text("stage").default("inquiry"),
  assignedToUserId: uuid("assigned_to_user_id"),
  aiScore: integer("ai_score").default(0),
  lastContactAt: timestamp("last_contact_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  address: text("address").notNull(),
  price: numeric("price"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  parking: integer("parking"),
  propertyType: text("property_type"),
  status: text("status").default("active"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const briefings = pgTable("briefings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: text("name").notNull(),
  stage: text("stage").default("qualification"),
  leadName: text("lead_name"),
  targetPrice: numeric("target_price"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
