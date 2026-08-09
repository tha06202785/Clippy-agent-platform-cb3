import { NextRequest, NextResponse } from "next/server";
import { getPublicBillingCatalog } from "@/lib/billing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(ip, "subscription/plans");
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return NextResponse.json(getPublicBillingCatalog());
}
