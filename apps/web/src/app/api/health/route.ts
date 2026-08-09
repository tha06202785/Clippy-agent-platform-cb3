import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.1.0",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    commitRef: process.env.VERCEL_GIT_COMMIT_REF || "local",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "local",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
    timestamp: new Date().toISOString(),
  });
}
