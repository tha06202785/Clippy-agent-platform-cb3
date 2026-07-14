import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId, leadData } = await req.json();

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "https://ollama.com/v1";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    const prompt = "Qualify this real estate lead. Score from 0-100 and provide reasoning.\n\nLead info:\n" + JSON.stringify(leadData || {}) + "\n\nRespond with JSON: { score: number, reasoning: string, suggested_action: string }";

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OLLAMA_API_KEY,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: "You are a lead qualification AI for real estate." },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI error" }, { status: 502 });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || data.message?.content || "{}";

    let qualification;
    try {
      qualification = JSON.parse(result);
    } catch {
      qualification = { score: 50, reasoning: result, suggested_action: "Follow up" };
    }

    if (leadId) {
      await supabase.from("leads").update({ ai_score: qualification.score }).eq("id", leadId);
    }

    return NextResponse.json(qualification);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
