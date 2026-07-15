import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ─── Types ───
interface IncomingMessage {
  orgId: string;
  channel: string;
  leadId?: string;
  conversationId?: string;
  message: string;
  attachments?: any[];
  metadata?: Record<string, any>;
  externalId?: string;
  externalConversationId?: string;
}

interface AiOutput {
  reply: string;
  confidence: number;
  leadStage: string;
  nextAction: string;
  escalation: boolean;
  escalationReason?: string;
  followUp?: { action: string; delay: string };
  crmUpdates?: Record<string, any>;
  tags?: string[];
  sentiment?: string;
  scores?: {
    buyingReadiness: number;
    likelihoodToInspect: number;
    probabilityOfPurchase: number;
    urgency: number;
  };
}

// ─── Lead Stage Engine ───
function determineLeadStage(currentStage: string, message: string, leadData: any, scores: any): string {
  const lower = message.toLowerCase();

  // Escalation triggers
  if (lower.includes("lawyer") || lower.includes("solicitor") || lower.includes("sue") ||
      lower.includes("complaint") || lower.includes("legal") || lower.includes("contract")) {
    return "negotiation";
  }

  // Offer indicators
  if (lower.includes("make an offer") || lower.includes("offer") && lower.includes("price") ||
      lower.includes("how much") && lower.includes("offer")) {
    return "offer";
  }

  // Inspection indicators
  if (lower.includes("inspect") || lower.includes("open home") || lower.includes("viewing") ||
      lower.includes("see the property") || lower.includes("tour")) {
    return "inspection_booked";
  }

  // Hot buyer indicators
  if (lower.includes("approved") && lower.includes("finance") ||
      lower.includes("ready to buy") || lower.includes("want to buy") ||
      lower.includes("keen") || lower.includes("very interested")) {
    return "hot";
  }

  // Warm buyer indicators
  if (lower.includes("interested") || lower.includes("looking") || lower.includes("searching") ||
      lower.includes("considering") || lower.includes("maybe")) {
    return "warm";
  }

  // New buyer indicators
  if (lower.includes("buying") || lower.includes("looking for") || lower.includes("need a") ||
      lower.includes("want a") || lower.includes("budget") || lower.includes("bedroom")) {
    return "new";
  }

  // Default: stay at current stage or unknown
  return currentStage || "unknown";
}

// ─── Context Builder ───
async function buildContext(supabase: any, orgId: string, leadId?: string, conversationId?: string) {
  const context: any = { orgId };

  // Load org settings
  const { data: org } = await supabase.from("orgs").select("*").eq("id", orgId).single();
  context.org = org;

  // Load agent voice
  const { data: voice } = await supabase.from("agent_voice").select("*").eq("org_id", orgId).single();
  context.voice = voice;

  // Load lead data
  if (leadId) {
    const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
    context.lead = lead;

    const { data: memory } = await supabase.from("lead_memory").select("*").eq("lead_id", leadId).single();
    context.memory = memory;

    const { data: scores } = await supabase.from("lead_scores").select("*").eq("lead_id", leadId).single();
    context.scores = scores;
  }

  // Load conversation history
  if (conversationId) {
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);
    context.conversationHistory = messages || [];
  }

  // Load recent listings for this org
  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, price, bedrooms, bathrooms, property_type, status, features")
    .eq("org_id", orgId)
    .eq("status", "active")
    .limit(10);
  context.listings = listings || [];

  return context;
}

// ─── LLM Call ───
async function callLlm(systemPrompt: string, userMessage: string, context: any): Promise<any> {
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY!;
  const OLLAMA_ENDPOINT = "https://ollama.com/v1/chat/completions";
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

  const contextBlock = "ORG: " + (context.org?.name || "Unknown") + "
LEAD: " + (context.lead?.full_name || "Unknown") + "
LEAD STAGE: " + (context.lead?.stage || "unknown");

  const response = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OLLAMA_API_KEY,
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "CONTEXT:\n" + contextBlock + "\n\nLEAD MESSAGE:\n" + userMessage },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LLM error:", response.status, errorText);
    throw new Error("LLM service error");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("Empty LLM response");

  try {
    return JSON.parse(content);
  } catch {
    // If not valid JSON, wrap as reply
    return { reply: content, confidence: 0.5, leadStage: "unknown", nextAction: "reply", escalation: false };
  }
}

// ─── Agent 1: Intent Detection ───
const INTENT_AGENT = ;

// ─── Agent 2: Lead Qualification ───
const QUALIFICATION_AGENT = ;

// ─── Agent 3: Lead Stage ───
const STAGE_AGENT = ;

// ─── Agent 4: Response Writer ───
const RESPONSE_AGENT = ;

// ─── Agent 5: Compliance ───
const COMPLIANCE_AGENT = ;

// ─── Agent 6: CRM Updater ───
const CRM_AGENT = ;

// ─── Main Handler ───
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = await getClientIp();
    const { allowed } = checkRateLimit(ip, "ai-message");
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body: IncomingMessage = await req.json();
    if (!body.orgId || !body.message) {
      return NextResponse.json({ error: "orgId and message are required" }, { status: 400 });
    }

    // 1. Resolve or create conversation
    let conversationId = body.conversationId;
    if (!conversationId) {
      const { data: conv } = await supabase.from("conversations").insert({
        org_id: body.orgId,
        lead_id: body.leadId || null,
        channel: body.channel || "website",
        external_conversation_id: body.externalConversationId || null,
        status: "active",
        lead_stage: "unknown",
      }).select().single();
      conversationId = conv?.id;
    }

    // 2. Save incoming message
    const { data: savedMsg } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: "lead",
      content: body.message,
      channel: body.channel || "website",
      external_message_id: body.externalId || null,
      attachments: body.attachments || null,
      metadata: body.metadata || null,
    }).select().single();

    // 3. Build context
    const context = await buildContext(supabase, body.orgId, body.leadId, conversationId);

    // 4. Run intent detection
    const intent = await callLlm(INTENT_AGENT, body.message, context);

    // 5. Run qualification extraction
    const qualification = await callLlm(QUALIFICATION_AGENT, body.message, context);

    // 6. Determine lead stage
    const currentStage = context.lead?.stage || context.conversationHistory?.[0]?.lead_stage || "unknown";
    const stageResult = await callLlm(STAGE_AGENT, body.message, { ...context, currentStage });

    // 7. Generate reply
    const responseResult = await callLlm(RESPONSE_AGENT, body.message, context);

    // 8. Check compliance
    const compliance = await callLlm(COMPLIANCE_AGENT, responseResult.reply || "", context);

    // 9. Extract CRM updates
    const crmUpdates = await callLlm(CRM_AGENT, body.message, context);

    // 10. Build output
    const output: AiOutput = {
      reply: responseResult.reply || "Thanks for your message! I'll look into that and get back to you shortly.",
      confidence: intent.confidence || 0.5,
      leadStage: stageResult.stage || currentStage,
      nextAction: intent.intent === "inspection" ? "book_inspection" :
                  intent.intent === "negotiation" ? "escalate" :
                  intent.intent === "complaint" ? "escalate" : "reply",
      escalation: intent.intent === "negotiation" || intent.intent === "complaint" || (compliance.passed === false) || false,
      escalationReason: intent.intent === "negotiation" ? "Negotiation detected - requires human agent" :
                        intent.intent === "complaint" ? "Complaint detected - requires human agent" :
                        compliance.passed === false ? "Compliance check failed" : undefined,
      sentiment: intent.intent === "complaint" ? "negative" : intent.intent === "inspection" ? "positive" : "neutral",
      scores: {
        buyingReadiness: stageResult.stage === "hot" ? 0.85 : stageResult.stage === "warm" ? 0.6 : 0.3,
        likelihoodToInspect: intent.intent === "inspection" ? 0.9 : 0.4,
        probabilityOfPurchase: stageResult.stage === "hot" ? 0.7 : stageResult.stage === "warm" ? 0.4 : 0.1,
        urgency: stageResult.stage === "hot" ? 0.8 : 0.3,
      },
      crmUpdates: crmUpdates || undefined,
    };

    // 11. Save AI response message
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: "ai",
      content: output.reply,
      channel: body.channel || "website",
      sentiment: output.sentiment || "neutral",
      ai_confidence: output.confidence,
      ai_action: output.nextAction,
      metadata: { intent, stageResult, compliance },
    });

    // 12. Update conversation
    await supabase.from("conversations").update({
      lead_stage: output.leadStage,
      message_count: supabase.rpc("increment", { x: 1 }),
      last_message_at: new Date().toISOString(),
      summary: null,
    }).eq("id", conversationId);

    // 13. Update lead if exists
    if (body.leadId) {
      await supabase.from("leads").update({
        stage: output.leadStage,
        last_contact_at: new Date().toISOString(),
        ai_score: Math.round((output.scores?.buyingReadiness || 0) * 100),
        priority: output.scores?.buyingReadiness > 0.7 ? "high" : output.scores?.buyingReadiness > 0.4 ? "medium" : "low",
      }).eq("id", body.leadId);

      // Update lead memory
      if (qualification) {
        const memoryUpdate: any = {};
        if (qualification.budget_min) memoryUpdate.budget_min = qualification.budget_min;
        if (qualification.budget_max) memoryUpdate.budget_max = qualification.budget_max;
        if (qualification.bedrooms) memoryUpdate.bedrooms_min = qualification.bedrooms;
        if (qualification.bathrooms) memoryUpdate.bathrooms_min = qualification.bathrooms;
        if (qualification.preferred_suburbs) memoryUpdate.preferred_suburbs = qualification.preferred_suburbs;
        if (qualification.school_needs) memoryUpdate.school_needs = qualification.school_needs;
        if (qualification.has_pets !== null) memoryUpdate.has_pets = qualification.has_pets;
        if (qualification.is_investment !== null) memoryUpdate.is_investment = qualification.is_investment;
        if (qualification.finance_approved !== null) memoryUpdate.finance_approved = qualification.finance_approved;
        if (qualification.timeline) memoryUpdate.timeline = qualification.timeline;
        if (qualification.reason_for_moving) memoryUpdate.reason_for_moving = qualification.reason_for_moving;
        if (qualification.partner_name) memoryUpdate.partner_name = qualification.partner_name;
        if (qualification.children_info) memoryUpdate.children_info = qualification.children_info;
        if (qualification.preferred_contact) memoryUpdate.preferred_contact = qualification.preferred_contact;

        if (Object.keys(memoryUpdate).length > 0) {
          await supabase.from("lead_memory").upsert({
            lead_id: body.leadId,
            ...memoryUpdate,
            last_updated: new Date().toISOString(),
          }, { onConflict: "lead_id" });
        }
      }

      // Update lead scores
      if (output.scores) {
        await supabase.from("lead_scores").upsert({
          lead_id: body.leadId,
          buying_readiness: output.scores.buyingReadiness,
          likelihood_to_inspect: output.scores.likelihoodToInspect,
          probability_of_purchase: output.scores.probabilityOfPurchase,
          urgency: output.scores.urgency,
          sentiment_score: output.sentiment === "positive" ? 0.8 : output.sentiment === "negative" ? 0.2 : 0.5,
          engagement_score: 0.5,
          last_computed: new Date().toISOString(),
        }, { onConflict: "lead_id" });
      }

      // Record stage change
      if (currentStage !== output.leadStage) {
        await supabase.from("lead_stage_history").insert({
          lead_id: body.leadId,
          from_stage: currentStage,
          to_stage: output.leadStage,
          reason: stageResult.reason || "AI classification",
          triggered_by: "ai",
        });
      }
    }

    // 14. Log AI action
    const latency = Date.now() - startTime;
    await supabase.from("ai_actions").insert({
      org_id: body.orgId,
      lead_id: body.leadId || null,
      conversation_id: conversationId,
      action_type: output.nextAction,
      input_summary: body.message.substring(0, 200),
      output_summary: output.reply.substring(0, 200),
      confidence: output.confidence,
      latency_ms: latency,
      tokens_used: 0,
      escalated: output.escalation,
      escalation_reason: output.escalationReason || null,
    });

    // 15. Schedule follow-up if needed
    if (output.followUp) {
      const delayMs = parseDelay(output.followUp.delay);
      await supabase.from("followup_queue").insert({
        org_id: body.orgId,
        lead_id: body.leadId || null,
        conversation_id: conversationId,
        action_type: output.followUp.action,
        scheduled_for: new Date(Date.now() + delayMs).toISOString(),
        context: { originalMessage: body.message, aiReply: output.reply },
        status: "pending",
      });
    }

    // 16. Return response
    return NextResponse.json({
      success: true,
      conversationId,
      reply: output.reply,
      leadStage: output.leadStage,
      nextAction: output.nextAction,
      escalation: output.escalation,
      escalationReason: output.escalationReason,
      scores: output.scores,
      confidence: output.confidence,
      latency,
    });

  } catch (error: any) {
    console.error("AI Message error:", error);
    return NextResponse.json({
      success: false,
      error: "AI processing error",
      reply: "Thanks for your message! I've noted it down and someone from our team will get back to you shortly.",
      escalation: true,
      escalationReason: "AI processing error - human review required",
    }, { status: 200 }); // Return 200 so the channel adapter doesn't retry
  }
}

function parseDelay(delay: string): number {
  const match = delay.match(/^(\d+)\s*(h|hr|hour|hours|m|min|mins|minute|minutes|d|day|days)$/i);
  if (!match) return 3600000; // default 1 hour
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("h")) return value * 3600000;
  if (unit.startsWith("m")) return value * 60000;
  if (unit.startsWith("d")) return value * 86400000;
  return 3600000;
}
