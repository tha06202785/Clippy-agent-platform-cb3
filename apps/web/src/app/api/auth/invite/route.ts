import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email, role } = await req.json();
    if (!email || !role) return NextResponse.json({ error: "Email and role required" }, { status: 400 });

    // Get user's org
    const { data: orgMember } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).single();
    if (!orgMember) return NextResponse.json({ error: "No org found" }, { status: 400 });

    // Create invite record
    const { error } = await supabase.from("user_org_roles").insert({
      org_id: orgMember.org_id,
      user_id: email, // placeholder - real invite would use Supabase invite
      role: role,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
