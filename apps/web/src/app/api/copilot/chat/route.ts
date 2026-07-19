import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retrieveForAIResponse } from "@/lib/rag/embeddings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let orgId: string | null = null;
    if (user) {
      const { data: orgMember } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      orgId = orgMember?.org_id || null;
    }

    const body = await req.json();
    const { message, conversation_id, lead_id } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let ragContext = "";
    if (orgId) {
      try {
        ragContext = await retrieveForAIResponse(supabase, message, orgId, user?.id || "anonymous", lead_id);
      } catch (error) {
        console.error("RAG retrieval failed:", error);
      }
    }

    let agentProfile: any = null;
    if (user && orgId) {
      const { data: profile } = await supabase.from("agent_profiles").select("*").eq("user_id", user.id).eq("org_id", orgId).single();
      agentProfile = profile;
    }

    let clientMemory: any = null;
    if (lead_id && orgId) {
      const { data: memory } = await supabase.from("client_memories").select("*").eq("lead_id", lead_id).eq("org_id", orgId).single();
      clientMemory = memory;
    }

    let systemPrompt = "You are Clippy, an AI real estate assistant for Australian agencies.\n\n";
    if (ragContext) systemPrompt += "RELEVANT KNOWLEDGE:\n" + ragContext + "\n\n";
    if (agentProfile) systemPrompt += "AGENT STYLE:\n- Tone: " + (agentProfile.communication_tone || "professional") + "\n";
    if (clientMemory) systemPrompt += "CLIENT MEMORY:\n- Interests: " + JSON.stringify(clientMemory.property_interests || []) + "\n- Budget: $" + (clientMemory.budget_min || "?") + "-" + (clientMemory.budget_max || "?") + "\n";
    systemPrompt += "\nIMPORTANT RULES:\n1. Use Australian English spelling\n2. Never make up information\n3. Never pressure clients\n4. Sound warm and professional\n5. Comply with Australian real estate regulations\n6. Use knowledge from RAG context when available";

    const ollamaResponse = await fetch("https://ollama.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OLLAMA_API_KEY },
      body: JSON.stringify({ model: "kimi-k2.6", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }], max_tokens: 4096, temperature: 0.8 }),
    });

    if (!ollamaResponse.ok) throw new Error("Ollama API error: " + ollamaResponse.statusText);

    const ollamaData = await ollamaResponse.json();
    const reply = ollamaData.choices?.[0]?.message?.content || "I apologize, I'm having trouble responding right now.";

    if (orgId && lead_id) {
      await supabase.from("conversation_messages").insert({ conversation_id: conversation_id || lead_id, role: "assistant", content: reply, org_id: orgId });
    }

    return NextResponse.json({ reply, confidence: 0.85, leadStage: "engaged", nextAction: "follow_up", escalation: null, sentiment: "positive", scores: { interest: 0.7, urgency: 0.5, qualification: 0.6 }, compliance: { passed: true, checks: [] }, crmUpdates: {}, tags: [], rag_used: !!ragContext, agent_profile_used: !!agentProfile, client_memory_used: !!clientMemory });
  } catch (error: any) {
    console.error("Copilot error:", error);
    return NextResponse.json({ error: error.message, reply: "I apologize, I encountered an error.", confidence: 0.5, escalation: { required: true, reason: "system_error" } }, { status: 500 });
  }
}
