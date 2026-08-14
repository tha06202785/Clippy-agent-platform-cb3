import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import {
  readAutomationSecret,
  secureSecretMatch,
} from "@/lib/automation-security";

export const dynamic = "force-dynamic";

// Canonical automation mode — single source of truth
const AUTOMATION_MODE = "autonomous";

// Zod schema for AI output validation
const aiOutputSchema = z.object({
  reply: z.string().min(1).max(5000),
  confidence: z.number().min(0).max(1).default(0.5),
  leadStage: z.enum(["unknown","new","warm","hot","inspection_booked","offer","negotiation","contract","won","lost","nurture"]).default("unknown"),
  nextAction: z.enum(["reply","escalate","book_inspection","schedule_call","collect_info","nurture","stop"]).default("reply"),
  escalation: z.boolean().default(false),
  escalationReason: z.string().optional(),
  sentiment: z.enum(["positive","neutral","negative","angry"]).default("neutral"),
  scores: z.object({
    buyingReadiness: z.number().min(0).max(1).default(0.3),
    likelihoodToInspect: z.number().min(0).max(1).default(0.4),
    probabilityOfPurchase: z.number().min(0).max(1).default(0.1),
    urgency: z.number().min(0).max(1).default(0.3),
  }).optional(),
  extractedMemory: z.array(z.object({
    key: z.string(), value: z.any(), confidence: z.number().min(0).max(1)
  })).optional(),
  nextBestAction: z.object({
    type: z.string(), dueAt: z.string().nullable()
  }).optional(),
  compliance: z.object({
    status: z.enum(["passed","failed","flagged"]),
    flags: z.array(z.string())
  }).optional(),
}).strict();

interface IncomingMessage {
  channel: string; leadId?: string;
  conversationId?: string; message: string;
  attachments?: any[]; metadata?: Record<string, any>;
  externalId?: string; externalConversationId?: string;
  orgId?: string;
}

// Identity resolution
async function resolveIdentity(supabase: any, orgId: string, metadata: any) {
  if (!metadata?.email && !metadata?.phone) return null;
  const email = metadata.email?.toLowerCase().trim();
  const phone = metadata.phone?.replace(/[^0-9]/g, "");
  if (email) {
    const { data: existing } = await supabase
      .from("leads").select("id, full_name, email, phone")
      .eq("org_id", orgId!).eq("email", email).maybeSingle();
    if (existing) return existing;
  }
  if (phone) {
    const { data: existing } = await supabase
      .from("leads").select("id, full_name, email, phone")
      .eq("org_id", orgId!).eq("phone", phone).maybeSingle();
    if (existing) return existing;
  }
  const { data: lead } = await supabase.from("leads").insert({
    org_id: orgId!, full_name: metadata.name || null,
    email: email || null, phone: phone || null,
    source: "website", stage: "unknown",
  }).select().single();
  if (lead) {
    await supabase.from("lead_identities").insert({
      org_id: orgId!, lead_id: lead.id, channel: "website",
      email_normalized: email || null, phone_e164: phone || null,
    });
  }
  return lead;
}

// Check opt-out
async function checkOptOut(supabase: any, orgId: string, leadId?: string, email?: string, phone?: string) {
  if (leadId) {
    const { data: opt } = await supabase
      .from("opt_outs").select("id").eq("org_id", orgId!).eq("lead_id", leadId).maybeSingle();
    if (opt) return true;
  }
  if (email) {
    const { data: opt } = await supabase
      .from("opt_outs").select("id").eq("org_id", orgId!).eq("email", email).maybeSingle();
    if (opt) return true;
  }
  if (phone) {
    const { data: opt } = await supabase
      .from("opt_outs").select("id").eq("org_id", orgId!).eq("phone", phone).maybeSingle();
    if (opt) return true;
  }
  return false;
}

async function buildContext(supabase: any, orgId: string, leadId?: string, conversationId?: string) {
  const context: any = { orgId };
  const { data: org } = await supabase.from("orgs").select("*").eq("id", orgId).single();
  context.org = org;
  if (leadId) {
    const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
    context.lead = lead;
    const { data: memory } = await supabase
      .from("client_memories")
      .select("*")
      .eq("org_id", orgId)
      .eq("lead_id", leadId)
      .maybeSingle();
    context.memory = memory;
  }
  if (conversationId) {
    const { data: messages } = await supabase
      .from("conversation_messages").select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }).limit(50);
    context.conversationHistory = messages || [];
  }
  const { data: listings } = await supabase
    .from("listings").select("id, address, price, bedrooms, bathrooms, property_type, status, features")
    .eq("org_id", orgId!).in("status", ["active", "available"]).limit(20);
  context.listings = listings || [];
  return context;
}

async function callLlm(systemPrompt: string, userMessage: string, context: any): Promise<any> {
  const key = process.env.OLLAMA_API_KEY!;
  const url = "https://ollama.com/v1/chat/completions";
  const model = process.env.OLLAMA_MODEL || "kimi-k2.6";
  const ctxStr = JSON.stringify({
    org: context.org?.name || null,
    lead: context.lead?.full_name || null,
    stage: context.lead?.stage || null,
    memory: context.memory || null,
    history: (context.conversationHistory || []).slice(-5).map((m: any) => ({
      role: m.role, content: (m.content || "").substring(0, 200)
    })),
    listings: (context.listings || []).slice(0, 3).map((l: any) => ({ address: l.address, price: l.price }))
  });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({ model, messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "CONTEXT: " + ctxStr + " LEAD MESSAGE: " + userMessage },
    ], max_tokens: 2000, temperature: 0.7, response_format: { type: "json_object" } }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("LLM error:", response.status, errorText);
    throw new Error("LLM service error");
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("Empty LLM response");
  // Strip markdown code blocks if present
  const cleaned = content.replace("```json", "").replace("```", "").trim();

  try { return JSON.parse(cleaned); }
  catch { return { reply: cleaned, confidence: 0.5, leadStage: "unknown", nextAction: "reply", escalation: false }; }
}

const INTENT_AGENT = "You are an intent detection specialist for real estate. Analyze the lead message and determine their primary intent. Return JSON: { intent: buying|selling|rental|investment|question|complaint|inspection|negotiation|spam|other, confidence: 0.0-1.0, isRental: boolean }";
const QUALIFICATION_AGENT = "You are a lead qualification specialist. Extract buyer information from the message. Only include fields the lead mentioned. Return JSON with ONLY mentioned fields: { budget_min, budget_max, bedrooms, bathrooms, parking, preferred_suburbs, school_needs, has_pets, is_investment, finance_approved, timeline, reason_for_moving, partner_name, children_info, preferred_contact }";
const STAGE_AGENT = "You are a lead stage classifier. Given the current stage and message, determine the new stage. Return JSON: { stage: unknown|new|warm|hot|inspection_booked|offer|negotiation|contract|won|lost|nurture, reason: string, confidence: 0.0-1.0 }";
const RESPONSE_AGENT = "You are Clippy AI, a 24/7 Real Estate Lead Communication Copilot for Australian agents. Communicate like a top-performing real estate sales consultant. Build trust, answer questions, qualify the lead, book inspections. Never sound like AI. Be warm, professional, confident, human. Never use emojis excessively. Keep messages short. Never use phrases like discover, nestled, or perfect opportunity. Never make up information. Never pressure. Always personalise. Use Australian English. Return JSON: { reply: string, tone: professional|warm|casual, call_to_action: string }";

const RENTAL_AGENT = "You are Clippy AI Rental Specialist. You handle rental property enquiries, inspection bookings, and application conversion. Rules: 1) Always offer verified inspection times immediately - do NOT gate behind qualification. 2) Collect preferences conversationally: move-in date, occupants, pets, lease length. 3) Never discriminate or reject based on personal characteristics. 4) After inspection, ask how it went and offer application link. 5) Escalate: rent negotiation, bond disputes, legal questions, application decisions. 6) Never make up property details - use only verified listing facts. 7) Suggest alternative properties if this one is not suitable. 8) Honour opt-out requests immediately. Return JSON: { reply: string, tone: professional|warm|casual, call_to_action: string, offerSlots: boolean, suggestedSlotIds: string[], offerApplication: boolean, suggestAlternatives: boolean }";
const COMPLIANCE_AGENT = "You are a compliance checker for Australian real estate. Review the proposed reply. Return JSON: { passed: boolean, issues: string[], suggested_fix: string|null }. Check for: financial advice, legal advice, price guarantees, discrimination, privacy violations, pressure tactics, false information.";
const CRM_AGENT = "You are a CRM enrichment specialist. Extract new/changed lead info from the message. Return JSON with ONLY new fields: { full_name, email, phone, notes, buyer_type, priority: low|medium|high|null }";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const supabase = await createClient();

    // Derive org from authenticated session - NOT from request body
    const { data: { user } } = await supabase.auth.getUser();
    let orgId: string | null = null;
    if (user) {
      const { data: orgMember } = await supabase
        .from("user_org_roles").select("org_id").eq("user_id", user.id).maybeSingle();
      if (orgMember) orgId = orgMember.org_id;
    }

    const ip = await getClientIp();
    const { allowed } = checkRateLimit(ip, "ai-message");
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body: IncomingMessage = await req.json();
    if (!body.message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // If no authenticated user, require internal service secret
    if (!orgId) {
      const internalSecret = readAutomationSecret("INTERNAL_API_SECRET");
      const internalHeader = req.headers.get("x-internal-secret");
      if (!internalSecret) {
          console.warn("Internal AI automation disabled: secret is not securely configured");
        return NextResponse.json(
          { error: "Automation is securely disabled" },
          { status: 503 },
        );
      }
      if (!secureSecretMatch(internalHeader, internalSecret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!body.orgId || !z.string().uuid().safeParse(body.orgId).success) {
        return NextResponse.json(
          { error: "A valid organisation is required" },
          { status: 400 },
        );
      }
      const { data: organisation } = await supabase
        .from("orgs")
        .select("id")
        .eq("id", body.orgId)
        .maybeSingle();
      if (!organisation) {
        return NextResponse.json(
          { error: "Organisation not found" },
          { status: 404 },
        );
      }
      orgId = organisation.id;
    }

    // Check opt-out and channel preferences before processing
    const isOptedOut = await checkOptOut(supabase, orgId!, body.leadId,
      body.metadata?.email, body.metadata?.phone);
    if (isOptedOut) {
      return NextResponse.json({ success: true, optedOut: true,
        message: "Lead has opted out of communications." });
    }

    // Identity resolution
    let leadId = body.leadId;
    if (!leadId && body.metadata) {
      const resolved = await resolveIdentity(supabase, orgId!, body.metadata);
      if (resolved) leadId = resolved.id;
    }

    // Create or get conversation
    let conversationId = body.conversationId;
    if (!conversationId) {
      const { data: conv } = await supabase.from("conversations").insert({
        org_id: orgId!, lead_id: leadId || null,
        channel: body.channel || "website", status: "active",
        lead_stage: "unknown", automation_mode: AUTOMATION_MODE,
      }).select().single();
      conversationId = conv?.id;
    }

    // Check automation mode
    const { data: conv } = await supabase.from("conversations")
      .select("automation_mode").eq("id", conversationId).single();
    if (conv?.automation_mode === "paused") {
      return NextResponse.json({ success: true, reply: null, paused: true });
    }

    // Save incoming message
    const { data: savedMsg } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId, role: "lead",
      content: body.message, channel: body.channel || "website",
    }).select().single();

    // Build context
    const context = await buildContext(supabase, orgId!, leadId, conversationId);

    // Run AI agents
    const intent = await callLlm(INTENT_AGENT, body.message, context);
    const qualification = await callLlm(QUALIFICATION_AGENT, body.message, context);
    const stageResult = await callLlm(STAGE_AGENT, body.message, context);
    // Route to rental or sales agent based on intent
    const isRental = intent.isRental === true || intent.intent === "rental";
    const responseAgent = isRental ? RENTAL_AGENT : RESPONSE_AGENT;
    const responseResult = await callLlm(responseAgent, body.message, context);
    const compliance = await callLlm(COMPLIANCE_AGENT, responseResult.reply || "", context);

    // Validate AI output with Zod
    const currentStage = context.lead?.stage || "unknown";
    const compliancePassed = compliance?.passed === true;
    const complianceFailed = compliance?.passed === false;
    const complianceStatus: "passed" | "failed" | "unchecked" =
      complianceFailed ? "failed" : compliancePassed ? "passed" : "unchecked";

    const rawOutput = {
      reply: responseResult.reply || "Thanks for your message! I will look into that and get back to you.",
      confidence: intent.confidence || 0.5,
      leadStage: stageResult.stage || currentStage,
      nextAction: intent.intent === "inspection" ? "book_inspection" :
                  intent.intent === "negotiation" || intent.intent === "complaint" ? "escalate" : "reply",
      escalation: intent.intent === "negotiation" || intent.intent === "complaint" || complianceFailed,
      escalationReason: intent.intent === "negotiation" ? "Negotiation detected" :
                       intent.intent === "complaint" ? "Complaint detected" :
                       complianceFailed ? "Compliance check failed" : undefined,
      sentiment: intent.intent === "complaint" ? "negative" : intent.intent === "inspection" ? "positive" : "neutral",
      scores: {
        buyingReadiness: stageResult.stage === "hot" ? 0.85 : stageResult.stage === "warm" ? 0.6 : 0.3,
        likelihoodToInspect: intent.intent === "inspection" ? 0.9 : 0.4,
        probabilityOfPurchase: stageResult.stage === "hot" ? 0.7 : stageResult.stage === "warm" ? 0.4 : 0.1,
        urgency: stageResult.stage === "hot" ? 0.8 : 0.3,
      },
      compliance: { status: complianceStatus, flags: compliance?.issues || [] },
    };

    const validation = aiOutputSchema.safeParse(rawOutput);
    let output;
    if (!validation.success) {
      // Malformed LLM output — log but still return the best-effort reply.
      // Never silently discard the reply; CRM fields may be incomplete.
      console.error("AI output validation failed:", validation.error.format(), "\nRaw output:", JSON.stringify(rawOutput));
      output = rawOutput;
    } else {
      output = validation.data;
    }

    // Save AI response
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId, role: "ai",
      content: output.reply, channel: body.channel || "website",
      sentiment: output.sentiment || "neutral",
      ai_confidence: output.confidence, ai_action: output.nextAction,
    });

    // Update conversation
    await supabase.from("conversations").update({
      lead_stage: output.leadStage,
      last_message_at: new Date().toISOString(),
    }).eq("id", conversationId);

    // Update lead if exists
    if (leadId) {
      await supabase.from("leads").update({
        stage: output.leadStage,
        last_contact_at: new Date().toISOString(),
        ai_score: Math.round((output.scores?.buyingReadiness || 0) * 100),
        priority: (output.scores?.buyingReadiness || 0) > 0.7 ? "high" : (output.scores?.buyingReadiness || 0) > 0.4 ? "medium" : "low",
      }).eq("id", leadId);

      if (qualification && Object.keys(qualification).length > 0) {
        const familyRequirements: Record<string, unknown> = {};
        if (qualification.bedrooms)
          familyRequirements.bedrooms_min = qualification.bedrooms;
        if (qualification.bathrooms)
          familyRequirements.bathrooms_min = qualification.bathrooms;
        if (qualification.parking)
          familyRequirements.parking_min = qualification.parking;
        if (qualification.has_pets !== undefined)
          familyRequirements.has_pets = qualification.has_pets;
        const mem: Record<string, unknown> = {
          org_id: orgId,
          lead_id: leadId,
          updated_at: new Date().toISOString(),
          last_updated_by: "ai",
        };
        if (qualification.budget_min) mem.budget_min = qualification.budget_min;
        if (qualification.budget_max) mem.budget_max = qualification.budget_max;
        if (qualification.preferred_suburbs) mem.preferred_suburbs = qualification.preferred_suburbs;
        if (qualification.timeline) mem.buying_stage = qualification.timeline;
        if (Object.keys(familyRequirements).length > 0)
          mem.family_requirements = familyRequirements;
        if (Object.keys(mem).length > 4) {
          await supabase
            .from("client_memories")
            .upsert(mem, { onConflict: "lead_id" });
        }
      }

      if (currentStage !== output.leadStage) {
        await supabase.from("lead_stage_history").insert({
          lead_id: leadId, from_stage: currentStage,
          to_stage: output.leadStage, reason: stageResult.reason || "AI classification",
          triggered_by: "ai",
        });
      }
    }

    // Log AI action
    await supabase.from("ai_actions").insert({
      org_id: orgId!, lead_id: leadId || null,
      conversation_id: conversationId, action_type: output.nextAction,
      input_summary: body.message.substring(0, 200),
      output_summary: output.reply.substring(0, 200),
      confidence: output.confidence, latency_ms: Date.now() - startTime,
      escalated: output.escalation, escalation_reason: output.escalationReason || null,
    });

    // Create delivery attempt
    if (output.reply) {
      await supabase.from("message_delivery_attempts").insert({
        org_id: orgId!, channel: body.channel || "website",
        status: "sent", attempt_count: 1,
        idempotency_key: "msg_" + conversationId + "_" + Date.now(),
        delivered_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true, conversationId, leadId, reply: output.reply,
      leadStage: output.leadStage, nextAction: output.nextAction,
      escalation: output.escalation, escalationReason: output.escalationReason,
      scores: output.scores, confidence: output.confidence,
      latency: Date.now() - startTime,
    });

  } catch (error: any) {
    console.error("AI Message error:", error);
    return NextResponse.json({
      success: false, error: "AI processing error",
      reply: "Thanks for your message! I have noted it down and someone will get back to you.",
      escalation: true, escalationReason: "AI processing error",
    }, { status: 200 });
  }
}
