import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ count: 0, latest: null }, { status: 401 });

    const { data: member } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!member?.org_id) return NextResponse.json({ count: 0, latest: null });

    const [{ count, error: countError }, { data: latest, error: latestError }] = await Promise.all([
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("org_id", member.org_id)
        .eq("direction_in_out", "in")
        .is("read_at", null),
      supabase
        .from("messages")
        .select("id,conversation_id,text,created_at")
        .eq("org_id", member.org_id)
        .eq("direction_in_out", "in")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (countError || latestError) throw countError || latestError;

    return NextResponse.json(
      { count: count || 0, latest: latest || null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Unread count error", error instanceof Error ? error.message : error);
    return NextResponse.json({ count: 0, latest: null }, { status: 500 });
  }
}
