import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = {
    title: "Clippy Executive Board Report",
    generatedAt: new Date().toISOString(),
    overview: { totalAgents: 247, activeListings: 892, totalPipeline: "87M", monthlyRevenue: ".2M", avgDealSize: ".8M", conversionRate: "68%", agentRetention: "94%" },
    offices: [
      { name: "Sydney CBD", agents: 45, pipeline: "2M", revenue: "80K", growth: "+12%", status: "healthy" },
      { name: "Eastern Suburbs", agents: 38, pipeline: "8M", revenue: "50K", growth: "+8%", status: "healthy" },
      { name: "Inner West", agents: 52, pipeline: "1M", revenue: ".1M", growth: "+15%", status: "healthy" },
      { name: "Northern Beaches", agents: 41, pipeline: "9M", revenue: "20K", growth: "-3%", status: "warning" },
      { name: "Western Sydney", agents: 35, pipeline: "8M", revenue: "50K", growth: "+5%", status: "healthy" },
      { name: "South Sydney", agents: 36, pipeline: "M", revenue: "80K", growth: "-8%", status: "critical" },
    ],
    topAgents: [
      { name: "Sarah Chen", office: "Sydney CBD", deals: 12, volume: ".2M", commission: "46K" },
      { name: "James Wilson", office: "Inner West", deals: 9, volume: ".8M", commission: "04K" },
      { name: "Emma Thompson", office: "Eastern Suburbs", deals: 7, volume: ".1M", commission: "53K" },
    ],
    compliance: { openIssues: 5, criticalIssues: 1, resolvedThisPeriod: 12, avgResolutionTime: "3.2 days" },
    trends: { revenueGrowth: "+8.5%", agentGrowth: "+12%", listingGrowth: "+15%", responseTimeImprovement: "-30%" },
  };

  return NextResponse.json(report);
}
