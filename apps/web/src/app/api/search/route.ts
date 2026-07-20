import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json({ leads: [], deals: [] });

    const { data: orgMember } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).single();
    const orgId = orgMember?.org_id;

    const searchPattern = "%" + q + "%";
    
    const [leadsRes, listingsRes] = await Promise.all([
      supabase.from("leads").select("id, full_name, email, phone, stage")
        .eq("org_id", orgId)
        .or("full_name.ilike." + searchPattern + ",email.ilike." + searchPattern + ",phone.ilike." + searchPattern)
        .limit(10),
      supabase.from("listings").select("id, address, price, status, property_type")
        .eq("org_id", orgId)
        .or("address.ilike." + searchPattern + ",property_type.ilike." + searchPattern)
        .limit(10),
    ]);

    return NextResponse.json({
      leads: leadsRes.data || [],
      deals: listingsRes.data || [],
    });
  } catch {
    return NextResponse.json({ leads: [], deals: [] });
  }
}
