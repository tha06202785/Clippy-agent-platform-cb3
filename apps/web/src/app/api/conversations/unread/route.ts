import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMessageVisible } from "@/lib/conversations/message-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ count: 0, latest: null }, { status: 401 });

    const { data: member } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!member?.org_id) return NextResponse.json({ count: 0, latest: null });

    const { data: unread, error } = await supabase
      .from("messages")
      .select("id,conversation_id,text,created_at,raw_json")
      .eq("org_id", member.org_id)
      .eq("direction_in_out", "in")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1_000);
    if (error) throw error;
    const visibleUnread = (unread || []).filter(isMessageVisible);

    return NextResponse.json(
      { count: visibleUnread.length, latest: visibleUnread[0] || null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "Unread count error",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ count: 0, latest: null }, { status: 500 });
  }
}
