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

    const { leadName, leadMessage, context } = await req.json();

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "https://ollama.com/v1";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    const systemPrompt = "You are Clippy, an AI co-agent for real estate agents. Draft a professional reply to a lead. Be concise, warm, and helpful.";

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
          { role: "user", content: "Lead: " + leadName + "
Message: " + leadMessage + "
Context: " + (context || "No additional context") + "

Draft a reply:" },
        ],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "AI error" }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || data.message?.content || "No response";

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
