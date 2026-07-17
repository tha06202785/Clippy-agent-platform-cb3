import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([]);

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json([]);

    const { data: members } = await supabase
      .from("org_members")
      .select()
      .eq("org_id", orgMember.org_id);

    const formatted = (members || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      full_name: m.profiles?.full_name,
      email: m.profiles?.email,
      phone: m.profiles?.phone,
      avatar_url: m.profiles?.avatar_url,
      role: m.role,
      created_at: m.created_at,
      org_name: "Your Agency"
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Team members error:", error);
    return NextResponse.json([]);
  }
}
