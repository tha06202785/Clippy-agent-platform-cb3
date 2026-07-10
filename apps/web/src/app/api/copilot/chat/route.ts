import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { messages } = await req.json();

    // Lazy-init OpenAI to avoid build-time env check
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are Clippy, an AI co-agent for real estate agents. You help them manage leads, draft messages, schedule tours, and follow up with clients. Be concise, professional, and helpful. You work in Australian real estate.",
        },
        ...messages,
      ],
      max_tokens: 500,
    });

    return NextResponse.json({ reply: completion.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
