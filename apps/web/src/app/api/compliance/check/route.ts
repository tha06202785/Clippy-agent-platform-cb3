import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { agentId, orgId } = await req.json();

    // Simulated compliance checks
    const checks = [
      { type: "license", status: "pass", message: "License valid until Mar 2027" },
      { type: "trust_account", status: "fail", message: "Reconciliation overdue by 12 days", severity: "high" },
      { type: "agency_agreement", status: "pass", message: "All agreements signed and filed" },
      { type: "certificate", status: "warn", message: "Energy certificate missing for 3 listings", severity: "medium" },
      { type: "cpd_hours", status: "fail", message: "CPD hours not met for 2026", severity: "medium" },
      { type: "advertising", status: "pass", message: "All listings have compliance statements" },
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
