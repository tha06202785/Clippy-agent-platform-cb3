// ============================================================================
// AI API Routes
// ============================================================================

import { Router } from "express";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const router = Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/ai/draft-reply - Generate AI reply for a conversation
router.post("/draft-reply", async (req, res) => {
  try {
    const { conversation_id, tone = "professional", context } = req.body;
    
    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (messagesError) throw messagesError;
    
    // Get lead info
    const { data: conversation } = await supabase
      .from("conversations")
      .select("lead_id")
      .eq("id", conversation_id)
      .single();
    
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", conversation?.lead_id)
      .single();
    
    // Build prompt
    const conversationHistory = messages
      ?.map((m: any) => `${m.sender_type}: ${m.content}`)
      .join("\n");
    
    const prompt = `You are a professional real estate agent. Draft a reply to this conversation.

Lead: ${lead?.full_name}
Property Interest: ${lead?.property_interest || "Not specified"}
Tone: ${tone}

Conversation History:
${conversationHistory}

Draft a helpful, professional response:`;
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful real estate assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const draftReply = completion.choices[0]?.message?.content || "";
    
    // Log usage
    await supabase.from("usage_events").insert({
      org_id: lead?.org_id,
      event_type: "ai_message_drafted",
      tokens_used: completion.usage?.total_tokens,
      metadata: { conversation_id, tone },
    });
    
    res.json({
      success: true,
      data: {
        draft: draftReply,
        tokens_used: completion.usage?.total_tokens,
      },
    });
  } catch (error: any) {
    console.error("AI Draft Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/transcribe - Transcribe audio (voice notes)
router.post("/transcribe", async (req, res) => {
  try {
    const { audio_base64, language = "en" } = req.body;
    
    if (!audio_base64) {
      return res.status(400).json({
        success: false,
        error: "audio_base64 is required"
      });
    }
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio_base64, "base64");
    
    // Create a temporary file
    const tempFile = `/tmp/audio_${Date.now()}.webm`;
    require("fs").writeFileSync(tempFile, audioBuffer);
    
    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: require("fs").createReadStream(tempFile),
      model: "whisper-1",
      language,
    });
    
    // Clean up temp file
    require("fs").unlinkSync(tempFile);
    
    // Extract key facts using GPT
    const extractionPrompt = `Extract key facts from this voice note transcription. Return JSON with these fields:
- summary: brief summary
- action_items: array of tasks
- property_details: any property info mentioned
- contact_info: any phone/email mentioned
- follow_up_required: boolean

Transcription: ${transcription.text}`;
    
    const extraction = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: extractionPrompt }],
      response_format: { type: "json_object" },
    });
    
    const extractedData = JSON.parse(
      extraction.choices[0]?.message?.content || "{}"
    );
    
    res.json({
      success: true,
      data: {
        transcription: transcription.text,
        extracted: extractedData,
      },
    });
  } catch (error: any) {
    console.error("Transcription Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/generate-listing - Generate listing content
router.post("/generate-listing", async (req, res) => {
  try {
    const {
      address,
      suburb,
      bedrooms,
      bathrooms,
      features = [],
      tone = "professional",
      max_price,
    } = req.body;
    
    const prompt = `Write a compelling real estate listing for this property:

Address: ${address}, ${suburb}
Bedrooms: ${bedrooms}
Bathrooms: ${bathrooms}
Features: ${features.join(", ")}
Tone: ${tone}

Write:
1. A catchy headline (max 10 words)
2. A compelling description (2-3 paragraphs)
3. 3 social media posts (short, engaging)
4. Key selling points (bullet list)

Make it sound professional and appealing to potential buyers.`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert real estate copywriter. Create compelling property listings.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.8,
    });
    
    const content = completion.choices[0]?.message?.content || "";
    
    // Parse sections (simple parsing)
    const sections = content.split("\n\n");
    
    res.json({
      success: true,
      data: {
        raw: content,
        headline: sections[0]?.replace(/^1\.\s*/, ""),
        description: sections[1],
        social_posts: sections[2]?.split("\n").filter((s) => s.trim()),
        selling_points: sections[3]
          ?.split("\n")
          .filter((s) => s.startsWith("-") || s.startsWith("•")),
        tokens_used: completion.usage?.total_tokens,
      },
    });
  } catch (error: any) {
    console.error("Listing Generation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/qualify-lead - AI lead qualification
router.post("/qualify-lead", async (req, res) => {
  try {
    const { lead_id, conversation_history } = req.body;
    
    const prompt = `Analyze this lead conversation and provide qualification data.

Conversation:
${conversation_history}

Return JSON with:
- qualification_score: 0-100
- buying_intent: "hot", "warm", "cold"
- budget_estimate: estimated budget or "unknown"
- timeline: "immediate", "1-3 months", "3-6 months", "6+ months", "unknown"
- key_concerns: array of concerns
- recommended_actions: array of next steps
- summary: brief summary of the lead`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a real estate lead qualification expert.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    
    const qualification = JSON.parse(
      completion.choices[0]?.message?.content || "{}"
    );
    
    // Update lead with qualification data
    await supabase
      .from("leads")
      .update({
        qualification_score: qualification.qualification_score,
        ai_summary: qualification.summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead_id);
    
    res.json({ success: true, data: qualification });
  } catch (error: any) {
    console.error("Qualification Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
