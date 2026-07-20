import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/integrations/status - Get all integration statuses
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json([]);

    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .eq("org_id", orgMember.org_id);

    // Also get health status
    const { data: health } = await supabase
      .from("integration_health")
      .select("*")
      .eq("org_id", orgMember.org_id);

    // Merge data
    const merged = (integrations || []).map((integration: any) => {
      const healthData = (health || []).find((h: any) => h.provider === integration.provider);
      return {
        ...integration,
        status: healthData?.status || integration.status,
        last_sync_at: healthData?.last_sync_at,
        items_indexed: healthData?.items_indexed || 0,
        activity_summary: healthData?.activity_summary || {},
      };
    });

    return NextResponse.json(merged);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

// POST /api/integrations/status - Update integration health
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const body = await req.json();
    const { provider, status, items_indexed, activity_summary } = body;

    const { data, error } = await supabase
      .from("integration_health")
      .upsert({
        org_id: orgMember.org_id,
        provider,
        status,
        items_indexed,
        activity_summary,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
