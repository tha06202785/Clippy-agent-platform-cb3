import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface IncomingMessage {
  orgId: string; channel: string; leadId?: string;
  conversationId?: string; message: string;
  attachments?: any[]; metadata?: Record<string, any>;
  externalId?: string; externalConversationId?: string;
}

interface AiOutput {
  reply: string; confidence: number; leadStage: string;
  nextAction: string; escalation: boolean;
  escalationReason?: string; sentiment?: string;
  scores?: { buyingReadiness: number; likelihoodToInspect: number;
    probabilityOfPurchase: number; urgency: number; };
}

async function buildContext(supabase: any, orgId: string, leadId?: string, conversationId?: string) {
  const context: any = { orgId };
  const { data: org } = await supabase.from("orgs").select("*").eq("id", orgId).single();
  context.org = org;
  if (leadId) {
    const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
    context.lead = lead;
    const { data: memory } = await supabase.from("lead_memory").select("*").eq("lead_id", leadId).single();
    context.memory = memory;
  }
  if (conversationId) {
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);
    context.conversationHistory = messages || [];
  }
  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, price, bedrooms, bathrooms, property_type, status, features")
    .eq("org_id", orgId)
    .eq("status", "active")
    .limit(10);
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
    listings: (context.listings || []).slice(0, 3).map((l: any) => ({
      address: l.address, price: l.price
    }))
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "CONTEXT: " + ctxStr + "

LEAD MESSAGE: " + userMessage },
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
  try { return JSON.parse(content); }
  catch { return { reply: content, confidence: 0.5, leadStage: "unknown", nextAction: "reply", escalation: false }; }
}

const INTENT_AGENT = "You are an intent detection specialist for real estate. Analyze the lead message and determine their primary intent. Return JSON: { intent: buying|selling|rental|investment|question|complaint|inspection|negotiation|spam|other, confidence: 0.0-1.0 }";

const QUALIFICATION_AGENT = "You are a lead qualification specialist. Extract buyer information from the message. Only include fields the lead mentioned. Return JSON with ONLY mentioned fields: { budget_min, budget_max, bedrooms, bathrooms, parking, preferred_suburbs, school_needs, has_pets, is_investment, finance_approved, timeline, reason_for_moving, partner_name, children_info, preferred_contact }";

const STAGE_AGENT = "You are a lead stage classifier. Given the current stage and message, determine the new stage. Return JSON: { stage: unknown|new|warm|hot|inspection_booked|offer|negotiation|contract|won|lost|nurture, reason: string, confidence: 0.0-1.0 }";

const RESPONSE_AGENT = "You are Clippy AI, a 24/7 Real Estate Lead Communication Copilot for Australian agents. Communicate like a top-performing real estate sales consultant. Build trust, answer questions, qualify the lead, book inspections. Never sound like AI. Be warm, professional, confident, human. Never use emojis excessively. Keep messages short. Never use phrases like discover, nestled, dont miss out, perfect opportunity. Never make up information. Never pressure. Always personalise. Use Australian English. Return JSON: { reply: string, tone: professional|warm|casual, call_to_action: string }";

const COMPLIANCE_AGENT = "You are a compliance checker for Australian real estate. Review the proposed reply. Return JSON: { passed: boolean, issues: string[], suggested_fix: string|null }. Check for: financial advice, legal advice, price guarantees, discrimination, privacy violations, pressure tactics, false information.";

const CRM_AGENT = "You are a CRM enrichment specialist. Extract new/changed lead info from the message. Return JSON with ONLY new fields: { full_name, email, phone, notes, buyer_type, priority: low|medium|high|null }";

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
      return NextResponse.json({ error: "orgId and message required" }, { status: 400 });
    }

    // Create or get conversation
    let conversationId = body.conversationId;
    if (!conversationId) {
      const { data: conv } = await supabase.from("conversations").insert({
        org_id: body.orgId, lead_id: body.leadId || null,
        channel: body.channel || "website", status: "active", lead_stage: "unknown",
      }).select().single();
      conversationId = conv?.id;
    }

    // Save incoming message
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId, role: "lead",
      content: body.message, channel: body.channel || "website",
    });

    // Build context
    const context = await buildContext(supabase, body.orgId, body.leadId, conversationId);

    // Run AI agents
    const intent = await callLlm(INTENT_AGENT, body.message, context);
    const qualification = await callLlm(QUALIFICATION_AGENT, body.message, context);
    const stageResult = await callLlm(STAGE_AGENT, body.message, context);
    const responseResult = await callLlm(RESPONSE_AGENT, body.message, context);
    const compliance = await callLlm(COMPLIANCE_AGENT, responseResult.reply || "", context);

    // Build output
    const currentStage = context.lead?.stage || "unknown";
    const output: AiOutput = {
      reply: responseResult.reply || "Thanks for your message! I will look into that and get back to you.",
      confidence: intent.confidence || 0.5,
      leadStage: stageResult.stage || currentStage,
      nextAction: intent.intent === "inspection" ? "book_inspection" :
                  intent.intent === "negotiation" || intent.intent === "complaint" ? "escalate" : "reply",
      escalation: intent.intent === "negotiation" || intent.intent === "complaint" || compliance.passed === false,
      escalationReason: intent.intent === "negotiation" ? "Negotiation detected" :
                       intent.intent === "complaint" ? "Complaint detected" :
                       compliance.passed === false ? "Compliance check failed" : undefined,
      sentiment: intent.intent === "complaint" ? "negative" : intent.intent === "inspection" ? "positive" : "neutral",
      scores: {
        buyingReadiness: stageResult.stage === "hot" ? 0.85 : stageResult.stage === "warm" ? 0.6 : 0.3,
        likelihoodToInspect: intent.intent === "inspection" ? 0.9 : 0.4,
        probabilityOfPurchase: stageResult.stage === "hot" ? 0.7 : stageResult.stage === "warm" ? 0.4 : 0.1,
        urgency: stageResult.stage === "hot" ? 0.8 : 0.3,
      },
    };

    // Save AI response
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId, role: "ai",
      content: output.reply, channel: body.channel || "website",
      sentiment: output.sentiment || "neutral",
      ai_confidence: output.confidence,
      ai_action: output.nextAction,
    });

    // Update conversation
    await supabase.from("conversations").update({
      lead_stage: output.leadStage,
      last_message_at: new Date().toISOString(),
    }).eq("id", conversationId);

    // Update lead if exists
    if (body.leadId) {
      await supabase.from("leads").update({
        stage: output.leadStage,
        last_contact_at: new Date().toISOString(),
        ai_score: Math.round((output.scores?.buyingReadiness || 0) * 100),
        priority: output.scores?.buyingReadiness > 0.7 ? "high" : output.scores?.buyingReadiness > 0.4 ? "medium" : "low",
      }).eq("id", body.leadId);

      // Update lead memory
      if (qualification && Object.keys(qualification).length > 0) {
        const mem: any = { lead_id: body.leadId, last_updated: new Date().toISOString() };
        if (qualification.budget_min) mem.budget_min = qualification.budget_min;
        if (qualification.bedrooms) mem.bedrooms_min = qualification.bedrooms;
        if (qualification.preferred_suburbs) mem.preferred_suburbs = qualification.preferred_suburbs;
        if (qualification.timeline) mem.timeline = qualification.timeline;
        if (qualification.finance_approved !== null) mem.finance_approved = qualification.finance_approved;
        if (Object.keys(mem).length > 1) {
          await supabase.from("lead_memory").upsert(mem, { onConflict: "lead_id" });
        }
      }

      // Record stage change
      if (currentStage !== output.leadStage) {
        await supabase.from("lead_stage_history").insert({
          lead_id: body.leadId, from_stage: currentStage,
          to_stage: output.leadStage, reason: stageResult.reason || "AI classification",
          triggered_by: "ai",
        });
      }
    }

    // Log AI action
    await supabase.from("ai_actions").insert({
      org_id: body.orgId, lead_id: body.leadId || null,
      conversation_id: conversationId, action_type: output.nextAction,
      input_summary: body.message.substring(0, 200),
      output_summary: output.reply.substring(0, 200),
      confidence: output.confidence, latency_ms: Date.now() - startTime,
      escalated: output.escalation, escalation_reason: output.escalationReason || null,
    });

    return NextResponse.json({
      success: true, conversationId, reply: output.reply,
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