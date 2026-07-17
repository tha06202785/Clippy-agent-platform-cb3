import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ count: 0 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ count: 0 });

    const { count } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgMember.org_id)
      .eq("is_read", false);

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error("Unread count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
