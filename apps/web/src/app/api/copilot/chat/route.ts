import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { copilotChatSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import ClippyCompliance from "@clippy/compliance";

export const dynamic = "force-dynamic";

// Initialize compliance system
const clippy = new ClippyCompliance({
  jurisdiction: "australia",
  state: "VIC",
  platform: "webchat",
  agentName: "Clippy",
  agency: { name: "your agency" }
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "copilot");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const validation = validate(copilotChatSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { messages } = validation.data!;

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    if (!OLLAMA_API_KEY) {
      return NextResponse.json({ error: "AI service not configured. Contact support." }, { status: 503 });
    }
    const OLLAMA_ENDPOINT = "https://ollama.com/v1/chat/completions";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    // Get the last user message for compliance pre-flight
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Pre-flight compliance check
    const preFlight = clippy.preFlightCheck({ 
      message: lastMessage, 
      lead: {}, 
      platform: "webchat" 
    });

    // Build system prompt with compliance master prompt
    const systemPrompt = clippy.systemMasterPrompt() + "

" + clippy.platformPrompt();

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
        max_tokens: 4096,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama error:", response.status, errorText);
      return NextResponse.json({ error: "AI service error. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || data.message?.content || "";

    // Gate response through compliance filter
    const gateResult = clippy.gateResponse({ 
      response: reply, 
      platform: "webchat",
      replacements: { AGENT_NAME: "Clippy", AGENCY_NAME: "your agency" }
    });

    // If response should be blocked, return compliance warning
    if (gateResult.shouldBlock) {
      return NextResponse.json({ 
        error: "Response blocked by compliance filter",
        compliance: {
          riskLevel: gateResult.riskLevel,
          trigger: gateResult.trigger,
          reason: gateResult.reason
        }
      }, { status: 403 });
    }

    // Use the sanitized response
    reply = gateResult.safeResponse || reply;

    // Append disclaimers if required
    if (gateResult.disclaimersApplied && gateResult.disclaimersApplied.length > 0) {
      reply = reply + "

" + gateResult.disclaimersApplied.map((d: any) => d.text).join("
");
    }

    return NextResponse.json({ 
      reply,
      compliance: {
        riskLevel: gateResult.riskLevel,
        disclaimersApplied: gateResult.disclaimersApplied?.length || 0,
        shouldEscalate: gateResult.shouldEscalate,
        agentAlert: gateResult.agentAlert
      }
    });
  } catch (error: any) {
    console.error("Copilot error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
