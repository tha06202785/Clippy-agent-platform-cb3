import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { copilotChatSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "copilot");
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
    const body = await req.json();
    const validation = validate(copilotChatSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { messages } = validation.data!;

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY!;
    const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "https://api.ollama.com/v1";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    const systemPrompt = `You are Clippy, an AI co-agent for real estate agents in Australia. You help them manage leads, draft professional messages, schedule tours, and follow up with clients. Be concise, professional, and helpful. You work in Australian real estate markets. Always include appropriate disclaimers for financial and legal matters. Never provide financial advice.`;

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
          ...messages,
        ],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "AI error: " + errorText }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || data.message?.content || "No response";

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
