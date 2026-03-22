import { createServer } from "./_create-server";
import { eq, and, desc } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const app = new Hono();

// CORS
app.use("*", cors());

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// AUTH MIDDLEWARE
// ============================================
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  c.set("user", user);
  await next();
};

// ============================================
// LEADS API
// ============================================

// GET /api/leads - List all leads
app.get("/api/leads", authMiddleware, async (c) => {
  const user = c.get("user");
  const orgId = c.req.query("org_id");
  const status = c.req.query("status");
  const assigned = c.req.query("assigned_to");
  
  let query = supabase
    .from("leads")
    .select("*, lead_events(count), conversations(id, last_message_at)")
    .eq("org_id", orgId);
  
  if (status) query = query.eq("status", status);
  if (assigned) query = query.eq("assigned_to_user_id", assigned);
  
  const { data, error } = await query
    .order("created_at", { ascending: false });
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ leads: data });
});

// GET /api/leads/:id - Get single lead
app.get("/api/leads/:id", authMiddleware, async (c) => {
  const leadId = c.req.param("id");
  
  const { data: lead, error } = await supabase
    .from("leads")
    .select(`
      *,
      lead_events(*),
      conversations(*, messages(*)),
      linked_listing:listings(*)
    `)
    .eq("id", leadId)
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ lead });
});

// POST /api/leads - Create lead
const createLeadSchema = z.object({
  org_id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().default("api"),
  primary_channel: z.string().default("website"),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  notes: z.string().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
});

app.post("/api/leads", zValidator("json", createLeadSchema), async (c) => {
  const leadData = c.req.valid("json");
  
  // Create lead
  const { data: lead, error } = await supabase
    .from("leads")
    .insert([leadData])
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  
  // Create lead_event
  await supabase.from("lead_events").insert([{
    org_id: leadData.org_id,
    lead_id: lead.id,
    event_type: "created",
    payload_json: { source: "api" },
  }]);
  
  // Create task: follow_up_2h
  await supabase.from("tasks").insert([{
    org_id: leadData.org_id,
    lead_id: lead.id,
    type: "follow_up_2h",
    title: "Follow up on new lead",
    description: "New lead created via API",
    due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    priority: "high",
  }]);
  
  return c.json({ lead }, 201);
});

// PATCH /api/leads/:id - Update lead
app.patch("/api/leads/:id", authMiddleware, async (c) => {
  const leadId = c.req.param("id");
  const updates = await c.req.json();
  
  const { data, error } = await supabase
    .from("leads")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ lead: data });
});

// ============================================
// LEAD EVENTS API
// ============================================

// POST /api/leads/:id/events - Add event
app.post("/api/leads/:id/events", authMiddleware, async (c) => {
  const leadId = c.req.param("id");
  const { event_type, payload_json, triggered_by_user_id } = await c.req.json();
  
  // Get lead's org_id
  const { data: lead } = await supabase
    .from("leads")
    .select("org_id")
    .eq("id", leadId)
    .single();
  
  const { data, error } = await supabase
    .from("lead_events")
    .insert([{
      org_id: lead.org_id,
      lead_id: leadId,
      event_type,
      payload_json,
      triggered_by_user_id,
    }])
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ event: data }, 201);
});

// ============================================
// LISTINGS API
// ============================================

// GET /api/listings - List listings
app.get("/api/listings", authMiddleware, async (c) => {
  const orgId = c.req.query("org_id");
  const status = c.req.query("status") || "active";
  
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", status)
    .order("created_at", { ascending: false });
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ listings: data });
});

// GET /api/listings/:id - Get single listing
app.get("/api/listings/:id", authMiddleware, async (c) => {
  const listingId = c.req.param("id");
  
  const { data, error } = await supabase
    .from("listings")
    .select("*, content_packs(*), leads(count)")
    .eq("id", listingId)
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ listing: data });
});

// POST /api/listings - Create listing
const createListingSchema = z.object({
  org_id: z.string().uuid(),
  agent_user_id: z.string().uuid().optional(),
  address: z.string(),
  suburb: z.string(),
  state: z.string(),
  postcode: z.string(),
  type: z.enum(["sale", "rent", "commercial"]),
  price_display: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  carspaces: z.number().optional(),
  description_raw: z.string().optional(),
  features_json: z.record(z.any()).optional(),
});

app.post("/api/listings", zValidator("json", createListingSchema), async (c) => {
  const listingData = c.req.valid("json");
  
  const { data, error } = await supabase
    .from("listings")
    .insert([{ ...listingData, status: "draft" }])
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  
  // Create task: generate content pack
  await supabase.from("tasks").insert([{
    org_id: listingData.org_id,
    listing_id: data.id,
    type: "generate_content_pack",
    title: "Generate marketing content",
    description: "Create social media content for new listing",
    due_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    priority: "medium",
  }]);
  
  return c.json({ listing: data }, 201);
});

// ============================================
// TASKS API
// ============================================

// GET /api/tasks - List tasks
app.get("/api/tasks", authMiddleware, async (c) => {
  const orgId = c.req.query("org_id");
  const userId = c.req.query("assigned_to");
  const status = c.req.query("status") || "pending";
  
  let query = supabase
    .from("tasks")
    .select("*, leads(full_name), listings(address)")
    .eq("org_id", orgId)
    .eq("status", status)
    .order("due_at", { ascending: true });
  
  if (userId) query = query.eq("assigned_to_user_id", userId);
  
  const { data, error } = await query;
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ tasks: data });
});

// PATCH /api/tasks/:id/complete - Complete task
app.patch("/api/tasks/:id/complete", authMiddleware, async (c) => {
  const taskId = c.req.param("id");
  
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ task: data });
});

// ============================================
// WEBHOOK: Lead Capture
// ============================================

// POST /api/webhooks/lead-capture - Public endpoint
app.post("/api/webhooks/lead-capture", async (c) => {
  const payload = await c.req.json();
  
  // Validate webhook token
  const webhookToken = c.req.header("X-Webhook-Token");
  // TODO: Validate token against integrations table
  
  const {
    org_id,
    channel,
    email,
    phone,
    full_name,
    message,
    listing_id,
    source,
  } = payload;
  
  // Find or create lead
  let leadId;
  
  // Check if lead exists by email or phone
  const { data: existingLeads } = await supabase
    .from("lead_identities")
    .select("lead_id")
    .eq("org_id", orgId)
    .or(`email.eq.${email},phone.eq.${phone}`)
    .limit(1);
  
  if (existingLeads && existingLeads.length > 0) {
    // Update existing lead
    leadId = existingLeads[0].lead_id;
    await supabase
      .from("leads")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", leadId);
  } else {
    // Create new lead
    const { data: newLead } = await supabase
      .from("leads")
      .insert([{
        org_id,
        full_name,
        email,
        phone,
        primary_channel: channel,
        source: source || "webhook",
        status: "new",
        linked_listing_id: listing_id,
      }])
      .select()
      .single();
    
    leadId = newLead.id;
    
    // Create identity
    await supabase.from("lead_identities").insert([{
      org_id,
      lead_id: leadId,
      channel,
      email,
      phone,
    }]);
  }
  
  // Create lead event
  await supabase.from("lead_events").insert([{
    org_id,
    lead_id: leadId,
    event_type: "message_received",
    payload_json: { message, channel, source },
  }]);
  
  // Create conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .insert([{
      org_id,
      lead_id: leadId,
      channel,
      status: "active",
    }])
    .select()
    .single();
  
  // Create message
  await supabase.from("messages").insert([{
    org_id,
    conversation_id: conversation.id,
    direction: "in",
    text: message,
    status: "read",
  }]);
  
  // Create task: reply_now
  await supabase.from("tasks").insert([{
    org_id,
    lead_id: leadId,
    conversation_id: conversation.id,
    type: "reply_now",
    title: "Reply to new message",
    description: message,
    due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: "pending",
    priority: "urgent",
  }]);
  
  return c.json({
    success: true,
    lead_id: leadId,
    conversation_id: conversation.id,
  });
});

// ============================================
// AI: Draft Reply
// ============================================

// POST /api/ai/draft-reply
app.post("/api/ai/draft-reply", authMiddleware, async (c) => {
  const { conversation_id, tone } = await c.req.json();
  
  // Get conversation context
  const { data: conversation } = await supabase
    .from("conversations")
    .select(`
      *,
      leads(*),
      messages(*)
    `)
    .eq("id", conversation_id)
    .single();
  
  // TODO: Call OpenAI API to generate reply
  // For now, return placeholder
  
  const draftReply = {
    text: `Hi ${conversation.leads.full_name}, thanks for your inquiry about our property. I'd be happy to help you with more information.`,
    tone: tone || "professional",
    confidence: 0.85,
  };
  
  // Save draft
  await supabase
    .from("conversations")
    .update({
      ai_draft_reply: draftReply.text,
      ai_draft_generated_at: new Date().toISOString(),
    })
    .eq("id", conversation_id);
  
  return c.json({ draft: draftReply });
});

// ============================================
// CONTENT PACKS API
// ============================================

// POST /api/content-packs/generate
app.post("/api/content-packs/generate", authMiddleware, async (c) => {
  const { listing_id, pack_type, tone } = await c.req.json();
  
  // Get listing details
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listing_id)
    .single();
  
  // TODO: Call OpenAI to generate content
  // For now, return template
  
  const contentPack = {
    pack_type,
    tone,
    content_json: {
      caption_short: `🏠 ${listing.bedrooms}BR/${listing.bathrooms}BA in ${listing.suburb} - ${listing.price_display}`,
      caption_long: `Welcome to ${listing.address}! This stunning ${listing.bedrooms} bedroom, ${listing.bathrooms} bathroom property in ${listing.suburb} offers...`,
      hashtags: ["#RealEstate", "#ForSale", "#${listing.suburb}", "#Property"],
      cta: "Contact us today for a private inspection!",
      whatsapp: `Hi! I'm interested in ${listing.address}. Can you tell me more?`,
      portal: {
        headline: `${listing.bedrooms} Bedroom ${listing.type} in ${listing.suburb}`,
        body: listing.description_raw || "Beautiful property...",
      },
    },
  };
  
  const { data, error } = await supabase
    .from("content_packs")
    .insert([{
      org_id: listing.org_id,
      listing_id,
      pack_type,
      tone,
      content_json: contentPack.content_json,
      status: "draft",
    }])
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ content_pack: data });
});

export default app;
