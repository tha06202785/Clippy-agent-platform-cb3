import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req);
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

    const { address, bedrooms, bathrooms, price, features } = await req.json();

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "https://api.ollama.com/v1";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "kimi-k2.6";

    const prompt = "Write a professional real estate listing description for:\nAddress: " + address + "\nBedrooms: " + (bedrooms || "N/A") + "\nBathrooms: " + (bathrooms || "N/A") + "\nPrice: " + (price || "N/A") + "\nFeatures: " + (features || "N/A") + "\n\nWrite 2-3 paragraphs that are compelling and accurate.";

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OLLAMA_API_KEY,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: "You are a professional real estate copywriter." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI error" }, { status: 502 });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || data.message?.content || "";

    return NextResponse.json({ description });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
