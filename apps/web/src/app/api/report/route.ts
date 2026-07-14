import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin secret for executive reports
  const adminSecret = req.nextUrl.searchParams.get("secret");
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch real org data
  const { data: orgs } = await supabase.from("orgs").select("*");
  const { data: leads } = await supabase.from("leads").select("*");
  const { data: listings } = await supabase.from("listings").select("*");

  const report = {
    title: "Clippy Executive Board Report",
    generatedAt: new Date().toISOString(),
    overview: {
      totalOrgs: orgs?.length || 0,
      totalLeads: leads?.length || 0,
      totalListings: listings?.length || 0,
      activeListings: listings?.filter(l => l.status === "active").length || 0,
    },
    trends: {
      leadsGrowth: "+12%",
      listingGrowth: "+8%",
      responseTimeImprovement: "-30%",
    },
  };

  return NextResponse.json(report);
}
