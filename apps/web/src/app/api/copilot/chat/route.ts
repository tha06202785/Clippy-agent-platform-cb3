import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, conversation_history } = await req.json();

    const messages = [
      {
        role: "system" as const,
        content: "You are Clippy, an AI co-agent for real estate agents. You help agents manage leads, draft replies, schedule tours, and keep their pipeline moving. Be concise, professional, and helpful. When asked to take actions, explain what you would do. You can draft emails, summarize leads, suggest follow-ups, and provide market insights.",
      },
      ...(conversation_history || []),
      { role: "user" as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
    });

    return NextResponse.json({
      reply: completion.choices[0]?.message?.content || "I am not sure how to help with that.",
    });
  } catch (error: any) {
    console.error("Copilot error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
