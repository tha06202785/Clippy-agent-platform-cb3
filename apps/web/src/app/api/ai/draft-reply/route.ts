import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestCopilotCompletion } from "@/lib/ai/copilot-provider";
import {
  createSafeDraftFallback,
  enforceFirstPersonAgentVoice,
} from "@/lib/ai/draft-reply-fallback";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  conversation_id: z.string().uuid(),
  instruction: z.string().trim().max(1000).optional(),
});

const one = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] || null : value;

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "ai");
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Too many requests. Try again in ${Math.ceil((resetAt - Date.now()) / 1000)} seconds.`,
      },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid conversation is required." },
        { status: 400 },
      );
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "No organisation is linked to this account." },
        { status: 409 },
      );
    }

    const [
      { data: conversation, error: conversationError },
      { data: messages, error: messagesError },
      { data: profile },
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select(
          "id,channel,lead_id,enquiry_id,listing_id,leads(full_name,email,phone),listings(address,status)",
        )
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
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (conversationError || messagesError)
      throw conversationError || messagesError;
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );

    const lead = one(conversation.leads);
    const listing = one(conversation.listings);
    let enquiry: {
      booking_token?: string | null;
      listing_id?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null = null;
    let bookingLink = "";
    if (conversation.enquiry_id) {
      const { data } = await supabase
        .from("property_enquiries")
        .select("booking_token,listing_id,metadata")
        .eq("id", conversation.enquiry_id)
        .eq("org_id", membership.org_id)
        .maybeSingle();
      enquiry = data;
      if (enquiry?.booking_token && enquiry.listing_id) {
        const { count } = await supabase
          .from("inspection_time_slots")
          .select("id", { count: "exact", head: true })
          .eq("org_id", membership.org_id)
          .eq("listing_id", enquiry.listing_id)
          .eq("status", "published")
          .gt("starts_at", new Date().toISOString());
        if ((count || 0) > 0) {
          bookingLink = `${req.nextUrl.origin}/book/${enquiry.booking_token}`;
        }
      }
    }
    const enquiryAddress =
      enquiry?.metadata && typeof enquiry.metadata.property_address === "string"
        ? enquiry.metadata.property_address
        : null;
    const history = (messages || [])
      .toReversed()
      .map(
        (message) =>
          `${message.direction_in_out === "out" ? "Agent" : "Client"}: ${message.text || "(no text)"}`,
      )
      .join("\n");

    let reply = "";
    let model = "safe-fallback";
    let provider = "local";
    try {
      const completion = await requestCopilotCompletion({
        userId: user.id,
        messages: [
          {
            role: "system",
            content:
              "You are an Australian real-estate co-agent. Draft only the ready-to-send reply—no preamble, analysis or invented facts. Write from the agent's first-person perspective: always use I/I’ll/I can, and never refer to the agent by name in the message body or say that the agent will do something. Be concise, warm, professional and compliant. Use every relevant detail already supplied by the client; never ask them to repeat an address, phone number or other information present in the history. If a property is not linked but its address is in the message, acknowledge the address and say I’ll check the inspection options. When a verified booking link is supplied, invite the client to choose a suitable inspection time using that exact link and mention that confirmation and reminders will be sent. Never promise a phone call, availability, price, approval or an inspection time unless the agent explicitly instructed it or it appears as confirmed in context. Do not sign as Clippy. Close with Kind regards and the agent name when one is supplied.",
          },
          {
            role: "user",
            content: [
              `Channel: ${conversation.channel}`,
              `Client: ${lead?.full_name || "Unknown"}`,
              `Property: ${listing?.address || enquiryAddress || "Not linked"}`,
              listing?.status ? `Property status: ${listing.status}` : "",
              bookingLink
                ? `Verified inspection booking link: ${bookingLink}`
                : "",
              parsed.data.instruction
                ? `Agent instruction: ${parsed.data.instruction}`
                : "",
              profile?.full_name
                ? `Agent name: ${profile.full_name}`
                : "Agent name: not supplied; use Kind regards without inventing a name",
              "Conversation history:",
              history || "No message history.",
              "Draft the next agent reply.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      });
      reply = completion.data.choices?.[0]?.message?.content?.trim() || "";
      model = completion.model;
      provider = completion.provider;
    } catch (providerError) {
      console.warn(
        "Conversation draft provider fallback",
        providerError instanceof Error ? providerError.message : providerError,
      );
    }
    if (!reply) {
      const latestClientMessage = (messages || []).find(
        (message) => message.direction_in_out !== "out",
      )?.text;
      reply = createSafeDraftFallback({
        clientName: lead?.full_name,
        agentName: profile?.full_name,
        latestClientMessage,
      });
    }
    reply = enforceFirstPersonAgentVoice(reply, profile?.full_name);
    if (bookingLink && !reply.includes(bookingLink)) {
      const signoffIndex = reply.search(/\n(?:Kind|Warm|Best) regards/i);
      const bookingSentence = `You can choose a suitable inspection time here: ${bookingLink}. Once booked, I’ll send confirmation and reminders.`;
      reply =
        signoffIndex >= 0
          ? `${reply.slice(0, signoffIndex).trim()}\n\n${bookingSentence}${reply.slice(signoffIndex)}`
          : `${reply.trim()}\n\n${bookingSentence}`;
    }

    return NextResponse.json({
      draft_id: randomUUID(),
      reply,
      channel: conversation.channel,
      model,
      provider,
    });
  } catch (error) {
    console.error(
      "Conversation draft failed",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Clippy could not draft a reply right now. Please try again." },
      { status: 502 },
    );
  }
}
