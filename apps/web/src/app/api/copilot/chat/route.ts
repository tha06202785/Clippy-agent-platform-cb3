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

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY!;
    const OLLAMA_ENDPOINT = "https://ollama.com/v1/chat/completions";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    const systemPrompt = `You are Clippy, an AI co-agent purpose-built for real estate agents in Australia.

YOUR CAPABILITIES:
1. Lead management - draft replies, qualify leads, schedule follow-ups
2. Property caption generation - create professional marketing captions for social media, listings, and email
3. Compliance guidance - Australian real estate legislation across all 8 states
4. Message drafting - emails, SMS, WhatsApp, and social media posts
5. General real estate workflow assistance

CRITICAL - AUSTRALIAN REAL ESTATE COMPLIANCE (you MUST follow these):
1. NEVER give financial advice, price estimates, or property valuations - refer to a licensed valuer
2. NEVER give legal advice - refer to a solicitor or conveyancer
3. NEVER guarantee sale prices, rental yields, or timeframes
4. ALWAYS include: "This is not financial or legal advice. Please consult a licensed professional."
5. For NSW: reference Property and Stock Agents Act 2002
6. For VIC: reference Estate Agents Act 1980
7. For QLD: reference Property Occupations Act 2014
8. For WA: reference Real Estate and Business Agents Act 1978
9. For SA: reference Land Agents Act 1994
10. For ACT: reference Agents Act 2003
11. For TAS: reference Property Agents and Land Transactions Act 2005
12. For NT: reference Agents Licensing Act
13. Commission rates vary by state - never quote standard rates, always say "commission is negotiable"
14. All agency agreements must be in writing with cooling-off periods
15. Trust accounts must be handled by licensed professionals only
16. Smoking, meth, or illegal activity contamination requires disclosure
17. Strata reports (s.184 for NSW, equivalent in other states) must be recommended for apartments/townhouses
18. Building and pest inspections should always be recommended
19. Privacy Act 1988 applies to all client data handling
20. Anti-money laundering and counter-terrorism financing obligations apply

WHEN GENERATING PROPERTY CAPTIONS, FOLLOW THESE RULES:
- You are an expert Australian real estate copywriter
- Always provide 3 different caption options: Short and Punchy, Lifestyle and Emotional, Feature Focused
- Format each option in a clearly separated copy box with headings
- Use Australian English with tasteful emojis (not excessive)
- Keep paragraphs short and readable
- NEVER use generic AI phrases like "discover", "nestled", "don't miss out", or "perfect opportunity"
- Focus on lifestyle, emotion, and buyer appeal
- Each caption should be 80-180 words
- Include open home details, agent contact, and a strong CTA when provided
- If the user provides property details (address, suburb, beds, baths, features, etc.), use them
- If information is missing, simply omit it - never invent facts
- Make every caption unique - avoid repeating the same opening sentence
- Write naturally like a high-performing real estate agent
- Format output so an agent can copy and paste directly into social media or a CRM without editing

RESPONSE RULES:
- Be concise and direct. Agents are busy.
- When drafting messages, use professional but warm Australian English.
- When asked about compliance, cite the specific state legislation.
- When unsure about a compliance matter, say "I am not qualified to advise on this. Please consult your principal or a legal professional."
- Never make up legislation or case law. If you don't know, say so.
- Always end compliance-related responses with the disclaimer.`;

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
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama error:", response.status, errorText);
      return NextResponse.json({ error: "AI service error. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || data.message?.content || "";

    if (!reply) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Copilot error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
