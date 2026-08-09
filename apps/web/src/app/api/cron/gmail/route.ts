import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncGmailIntegration } from "@/lib/integrations/gmail-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Service role is not configured" }, { status: 500 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });
  const { data: integrations, error } = await supabase.from("integrations").select("*").eq("provider", "gmail").eq("status", "connected");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results = [];
  for (const integration of integrations || []) {
    try { results.push({ orgId: integration.org_id, ...(await syncGmailIntegration(supabase, integration)) }); }
    catch (syncError: any) { results.push({ orgId: integration.org_id, error: syncError.message }); }
  }
  return NextResponse.json({ success: true, results });
}
