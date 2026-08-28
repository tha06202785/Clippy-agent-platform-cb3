import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isMessageDeleted,
  isMessageHidden,
  isMessageVisible,
  messageRaw,
} from "@/lib/conversations/message-visibility";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const view =
    req.nextUrl.searchParams.get("view") === "hidden" ? "hidden" : "visible";
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "conversations");
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
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    if (!orgMember) return NextResponse.json([]);

    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select(
        "id,lead_id,listing_id,enquiry_id,channel,created_at,last_message_at,updated_at,leads(id,full_name,email,phone,priority,stage),listings(id,address,status),property_enquiries(id,status,source,last_activity_at)",
      )
      .eq("org_id", orgMember.org_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (conversationsError) throw conversationsError;

    const conversationIds = (conversations || []).map((item) => item.id);
    const { data: messages, error: messagesError } = conversationIds.length
      ? await supabase
          .from("messages")
          .select(
            "id,conversation_id,direction_in_out,text,created_at,read_at,raw_json",
          )
          .eq("org_id", orgMember.org_id)
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(5000)
      : { data: [], error: null };
    if (messagesError) throw messagesError;

    const storedMessageCounts = new Map<string, number>();
    const hiddenMessageCounts = new Map<string, number>();
    for (const message of messages || []) {
      storedMessageCounts.set(
        message.conversation_id,
        (storedMessageCounts.get(message.conversation_id) || 0) + 1,
      );
      if (isMessageDeleted(message)) continue;
      if (isMessageHidden(message)) {
        hiddenMessageCounts.set(
          message.conversation_id,
          (hiddenMessageCounts.get(message.conversation_id) || 0) + 1,
        );
      }
    }

    const messagesForView = (messages || []).filter((message) =>
      view === "hidden" ? isMessageHidden(message) : isMessageVisible(message),
    );
    const summaries = new Map<
      string,
      {
        latest_message: unknown;
        unread_count: number;
        message_count: number;
        relevance_tags: string[];
        relevance_decision: string | null;
        relevance_score: number | null;
      }
    >();
    for (const message of messagesForView) {
      const summary = summaries.get(message.conversation_id) || {
        latest_message: null,
        unread_count: 0,
        message_count: 0,
        relevance_tags: [],
        relevance_decision: null,
        relevance_score: null,
      };
      if (!summary.latest_message) summary.latest_message = message;
      summary.message_count += 1;
      const raw = messageRaw(message.raw_json);
      const messageTags = Array.isArray(raw.relevance_tags)
        ? raw.relevance_tags.filter(
            (tag): tag is string => typeof tag === "string",
          )
        : [];
      for (const tag of messageTags) {
        if (!summary.relevance_tags.includes(tag)) {
          summary.relevance_tags.push(tag);
        }
      }
      if (
        message.direction_in_out === "in" &&
        summary.relevance_decision === null
      ) {
        summary.relevance_decision =
          typeof raw.relevance === "string" ? raw.relevance : null;
        summary.relevance_score =
          typeof raw.relevance_score === "number" ? raw.relevance_score : null;
      }
      if (message.direction_in_out === "in" && !message.read_at) {
        summary.unread_count += 1;
      }
      summaries.set(message.conversation_id, summary);
    }

    const response = (conversations || [])
      .map((conversation) => ({
        ...conversation,
        ...(summaries.get(conversation.id) || {
          latest_message: null,
          unread_count: 0,
          message_count: 0,
          relevance_tags: [],
          relevance_decision: null,
          relevance_score: null,
        }),
        hidden_count: hiddenMessageCounts.get(conversation.id) || 0,
      }))
      .filter((conversation) => {
        if (view === "hidden") return conversation.message_count > 0;
        const storedCount = storedMessageCounts.get(conversation.id) || 0;
        return conversation.message_count > 0 || storedCount === 0;
      });
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    if (!orgMember)
      return NextResponse.json({ error: "No org membership" }, { status: 400 });

    const body = await req.json();
    const leadId = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
    const enquiryId =
      typeof body.enquiry_id === "string" ? body.enquiry_id.trim() : "";
    const requestedListingId =
      typeof body.listing_id === "string" ? body.listing_id.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    const externalThreadId =
      typeof body.external_thread_id === "string"
        ? body.external_thread_id.trim()
        : typeof body.external_id === "string"
          ? body.external_id.trim()
          : null;

    if (!leadId || !channel) {
      return NextResponse.json(
        { error: "lead_id and channel are required" },
        { status: 400 },
      );
    }

    const { data: client } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("org_id", orgMember.org_id)
      .maybeSingle();
    if (!client) {
      return NextResponse.json(
        { error: "Client does not belong to this organisation" },
        { status: 400 },
      );
    }

    let listingId = requestedListingId || null;
    if (enquiryId) {
      const { data: enquiry } = await supabase
        .from("property_enquiries")
        .select("id,lead_id,listing_id")
        .eq("id", enquiryId)
        .eq("org_id", orgMember.org_id)
        .maybeSingle();
      if (!enquiry || enquiry.lead_id !== leadId) {
        return NextResponse.json(
          { error: "Enquiry does not match this client" },
          { status: 400 },
        );
      }
      listingId = enquiry.listing_id;
    } else if (listingId) {
      const { data: listing } = await supabase
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .eq("org_id", orgMember.org_id)
        .maybeSingle();
      if (!listing) {
        return NextResponse.json(
          { error: "Property does not belong to this organisation" },
          { status: 400 },
        );
      }
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        org_id: orgMember.org_id,
        lead_id: leadId,
        enquiry_id: enquiryId || null,
        listing_id: listingId,
        channel,
        external_thread_id: externalThreadId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
