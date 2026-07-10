export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "https://api.ollama.cloud/v1/chat/completions";

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OLLAMA_API_KEY,
      },
      body: JSON.stringify({
        model: "llama3.2:3b",
        messages: [
          {
            role: "system",
            content: "You are Clippy, an AI co-agent for real estate agents. You help them manage leads, draft messages, schedule tours, and follow up with clients. Be concise, professional, and helpful. You work in Australian real estate.",
          },
          ...messages,
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "Ollama error: " + errorText }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || data.message?.content || "No response" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
