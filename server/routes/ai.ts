import "dotenv/config";
import { RequestHandler } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Draft Reply
export const draftReply: RequestHandler = async (req, res) => {
  try {
    const { conversation_id, tone = "professional", context } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ error: "conversation_id required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful real estate assistant. Generate a ${tone} reply to a lead inquiry. Keep it concise and professional.`,
        },
        {
          role: "user",
          content: context || "Generate a follow-up reply to a potential home buyer inquiry.",
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content || "I'd be happy to help you with that. Let me know what specific information you need.";

    res.json({
      success: true,
      reply,
      conversation_id,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Draft Reply Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate reply" });
  }
};

// Generate Property Listing
export const generateListing: RequestHandler = async (req, res) => {
  try {
    const { address, suburb, bedrooms, bathrooms, features = [], tone = "luxury" } = req.body;

    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const prompt = `Write a compelling real estate listing for:
Address: ${address}, ${suburb}
${bedrooms} bedrooms, ${bathrooms} bathrooms
Features: ${features.join(", ")}

Tone: ${tone}

Include an eye-catching headline and 2-3 paragraphs of description highlighting the key selling points.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert real estate copywriter. Create compelling property listings.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || "";

    // Parse headline and description
    const lines = content.split("\n").filter(line => line.trim());
    const headline = lines[0]?.replace(/^#\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, "") || `Stunning Property in ${suburb}`;
    const description = lines.slice(1).join("\n").trim();

    res.json({
      success: true,
      headline,
      description,
      address,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Listing Generator Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate listing" });
  }
};

// Transcribe Audio
export const transcribe: RequestHandler = async (req, res) => {
  try {
    const { audio_base64, language = "en" } = req.body;

    if (!audio_base64) {
      return res.status(400).json({ error: "audio_base64 required" });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio_base64, "base64");

    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      model: "whisper-1",
      language: language,
    });

    res.json({
      success: true,
      text: transcription.text,
      language,
      transcribed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Transcription Error:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio" });
  }
};

// Qualify Lead
export const qualifyLead: RequestHandler = async (req, res) => {
  try {
    const { lead_id, message, lead_data } = req.body;

    if (!lead_id || !message) {
      return res.status(400).json({ error: "lead_id and message required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a real estate lead qualification expert. Analyze the lead's message and determine:
1. Lead temperature (hot/warm/cold)
2. Intent (buying/selling/general inquiry)
3. Priority score (1-10)
4. Suggested next actions

Respond in JSON format only.`,
        },
        {
          role: "user",
          content: `Lead Message: ${message}\n\nLead Data: ${JSON.stringify(lead_data || {})}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

    res.json({
      success: true,
      lead_id,
      temperature: result.temperature || "warm",
      intent: result.intent || "general",
      priority_score: result.priority_score || 5,
      next_actions: result.next_actions || ["Follow up within 24 hours"],
      qualified_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Lead Qualification Error:", error);
    res.status(500).json({ error: error.message || "Failed to qualify lead" });
  }
};
