import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data: activities } = await supabase
      .from("clippy_activity_log")
      .select("*")
      .eq("org_id", orgMember.org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json(activities || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const body = await req.json();
    const { action, category, title, description, metadata, impact_summary } = body;

    if (!action || !category || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: activity, error } = await supabase
      .from("clippy_activity_log")
      .insert({
        org_id: orgMember.org_id,
        user_id: user.id,
        action,
        category,
        title,
        description,
        metadata,
        impact_summary,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
