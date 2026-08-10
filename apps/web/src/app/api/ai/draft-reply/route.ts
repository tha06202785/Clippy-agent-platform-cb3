import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestCopilotCompletion } from "@/lib/ai/copilot-provider";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  conversation_id: z.string().uuid(),
  instruction: z.string().trim().max(1000).optional(),
});

const one = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] || null : value;

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "ai");
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${Math.ceil((resetAt - Date.now()) / 1000)} seconds.` },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid conversation is required." }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.json({ error: "No organisation is linked to this account." }, { status: 409 });
    }

    const [{ data: conversation, error: conversationError }, { data: messages, error: messagesError }] = await Promise.all([
      supabase
        .from("conversations")
        .select("id,channel,lead_id,listing_id,leads(full_name,email,phone),listings(address,status)")
        .eq("id", parsed.data.conversation_id)
        .eq("org_id", membership.org_id)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("direction_in_out,text,created_at")
        .eq("conversation_id", parsed.data.conversation_id)
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (conversationError || messagesError) throw conversationError || messagesError;
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const lead = one(conversation.leads);
    const listing = one(conversation.listings);
    const history = (messages || []).toReversed().map((message) =>
      `${message.direction_in_out === "out" ? "Agent" : "Client"}: ${message.text || "(no text)"}`,
    ).join("\n");

    const completion = await requestCopilotCompletion({
      userId: user.id,
      messages: [
        {
          role: "system",
          content: "You are Clippy, an Australian real-estate co-agent. Draft only the reply message—no preamble, analysis or invented facts. Be concise, warm, professional and compliant. If essential information is missing, ask a clear question. Never promise availability, price, approval or an inspection time unless it appears in the supplied context.",
        },
        {
          role: "user",
          content: [
            `Channel: ${conversation.channel}`,
            `Client: ${lead?.full_name || "Unknown"}`,
            `Property: ${listing?.address || "Not linked"}`,
            listing?.status ? `Property status: ${listing.status}` : "",
            parsed.data.instruction ? `Agent instruction: ${parsed.data.instruction}` : "",
            "Conversation history:",
            history || "No message history.",
            "Draft the next agent reply.",
          ].filter(Boolean).join("\n"),
        },
      ],
    });
    const reply = completion.data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("AI service returned an empty draft");

    return NextResponse.json({
      draft_id: randomUUID(),
      reply,
      channel: conversation.channel,
      model: completion.model,
      provider: completion.provider,
    });
  } catch (error) {
    console.error("Conversation draft failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Clippy could not draft a reply right now. Please try again." }, { status: 502 });
  }
}
