import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "ai");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId, leadData } = await req.json();

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_ENDPOINT = "https://ollama.com/v1/chat/completions";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    const prompt = "Qualify this real estate lead. Score from 0-100 and provide reasoning.\n\nLead info:\n" + JSON.stringify(leadData || {}) + "\n\nYou MUST respond with ONLY valid JSON in this exact format, no markdown, no explanation:\n{\"score\": number, \"reasoning\": \"string\", \"suggested_action\": \"string\"}";

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OLLAMA_API_KEY,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: "You are a lead qualification AI for real estate. Respond ONLY with valid JSON matching the exact schema provided." },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI error" }, { status: 502 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || data.message?.content || "{}";

    // Robust JSON extraction: try direct parse first, then regex fallback
    let qualification: { score: number; reasoning: string; suggested_action: string };
    try {
      qualification = JSON.parse(raw);
    } catch {
      // Try to extract JSON object from prose/markdown
      const jsonMatch = raw.match(/\{[^{}]*\}/s);
      if (jsonMatch) {
        try {
          qualification = JSON.parse(jsonMatch[0]);
        } catch {
          qualification = { score: 50, reasoning: raw.slice(0, 200), suggested_action: "Follow up" };
        }
      } else {
        qualification = { score: 50, reasoning: raw.slice(0, 200), suggested_action: "Follow up" };
      }
    }

    // Validate required fields
    if (typeof qualification.score !== "number" || isNaN(qualification.score)) {
      qualification.score = 50;
    }
    if (!qualification.reasoning) qualification.reasoning = "Score assigned by fallback parser";
    if (!qualification.suggested_action) qualification.suggested_action = "Follow up";

    if (leadId) {
      await supabase.from("leads").update({ ai_score: qualification.score }).eq("id", leadId);
    }

    return NextResponse.json(qualification);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
