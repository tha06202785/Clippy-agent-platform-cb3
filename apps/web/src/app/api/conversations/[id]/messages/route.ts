import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isMessageDeleted,
  isMessageHidden,
  isMessageVisible,
} from "@/lib/conversations/message-visibility";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: member } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    if (!member)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(
        "id,lead_id,listing_id,enquiry_id,channel,last_message_at,leads(id,full_name,email,phone),listings(id,address,status),property_enquiries(id,status,source)",
      )
      .eq("id", id)
      .eq("org_id", member.org_id)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id,direction_in_out,text,created_at,read_at,raw_json")
      .eq("org_id", member.org_id)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (messagesError) throw messagesError;

    const view =
      req.nextUrl.searchParams.get("view") === "hidden" ? "hidden" : "visible";
    const filteredMessages = (messages || []).filter((message) => {
      if (isMessageDeleted(message)) return false;
      return view === "hidden"
        ? isMessageHidden(message)
        : isMessageVisible(message);
    });
    const unreadIds = filteredMessages
      .filter(
        (message) => message.direction_in_out === "in" && !message.read_at,
      )
      .map((message) => message.id);
    if (unreadIds.length) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("org_id", member.org_id)
        .in("id", unreadIds);
    }

    return NextResponse.json({ conversation, messages: filteredMessages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
