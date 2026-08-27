import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loadConfirmedAgentDnaPrompt } from "@/lib/agent-dna";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "ai");
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Too many requests. Try again in " +
          Math.ceil((resetAt - Date.now()) / 1000) +
          " seconds.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "No organisation found" },
        { status: 409 },
      );
    }

    const { prompt, type } = await req.json();

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_ENDPOINT = "https://ollama.com/v1/chat/completions";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    let agentDnaPrompt = "";
    try {
      agentDnaPrompt = await loadConfirmedAgentDnaPrompt(
        supabase,
        membership.org_id,
        user.id,
      );
    } catch (error) {
      console.error("Content Agent DNA lookup failed", error);
    }
    const systemPrompt = [
      "You are Clippy, an AI co-agent for Australian real estate agents. Generate professional real estate content. Be concise, accurate and never invent facts.",
      agentDnaPrompt,
      "Current user instructions, verified facts, Australian compliance and agency policies always take priority over personalisation.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + OLLAMA_API_KEY,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "Generate " + (type || "content") + ": " + prompt,
          },
        ],
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI error" }, { status: 502 });
    }

    const data = await response.json();
    const content =
      data.choices?.[0]?.message?.content || data.message?.content || "";

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
