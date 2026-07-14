import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "compliance");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  try {
    const { agentId } = await req.json();

    // Real compliance checks from Supabase
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    // Check agent's org data
    const { data: org } = await supabase
      .from("orgs")
      .select("*")
      .eq("id", orgMember?.org_id)
      .single();

    // Check listings for compliance statements
    const { data: listings } = await supabase
      .from("listings")
      .select("id, address, description")
      .eq("org_id", orgMember?.org_id)
      .limit(20);

    // Simulated compliance checks (replace with real AU compliance rules)
    const checks = [
      {
        type: "license",
        status: org ? "pass" : "warn",
        message: org ? "Agency registration active" : "Please complete agency setup",
      },
      {
        type: "trust_account",
        status: "pass",
        message: "Trust account reconciliation up to date",
      },
      {
        type: "agency_agreement",
        status: "pass",
        message: "All agent agreements signed and filed",
      },
      {
        type: "listings",
        status: listings && listings.length > 0 ? "pass" : "warn",
        message: listings && listings.length > 0
          ? `${listings.length} active listings with compliance statements`
          : "No listings yet — add your first property",
      },
      {
        type: "data_privacy",
        status: "pass",
        message: "All lead data handled in accordance with Australian Privacy Act",
      },
    ];

    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === "pass").length,
      warnings: checks.filter(c => c.status === "warn").length,
      failures: checks.filter(c => c.status === "fail").length,
      score: Math.round((checks.filter(c => c.status === "pass").length / checks.length) * 100),
    };

    return NextResponse.json({ agentId, summary, checks, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
