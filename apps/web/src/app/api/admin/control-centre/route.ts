import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getAdminContext();
    if (context.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (context.status === "unavailable") {
      return NextResponse.json(
        { error: "Authentication is not configured for this environment" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (context.status === "forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { membership, supabase } = context;
    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "Organisation admin access required" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    const orgId = membership.org_id;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [subscriptionResult, balanceResult, usageResult, incidentsResult, ticketsResult, integrationsResult] =
      await Promise.all([
        supabase
          .from("org_subscriptions")
          .select("status, current_period_end, plans(key,name,monthly_price_cents,included_credits,currency)")
          .eq("org_id", orgId)
          .maybeSingle(),
        supabase
          .from("org_usage_balances")
          .select("credits_included, credits_bonus, credits_used, cost_micros, period_start, period_end")
          .eq("org_id", orgId)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("ai_usage_events")
          .select("feature_key, provider, model, credits_used, cost_micros, latency_ms, status, created_at")
          .eq("org_id", orgId)
          .gte("created_at", monthStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("system_incidents")
          .select("id,severity,component,title,status,last_seen_at,occurrence_count")
          .or(`org_id.eq.${orgId},org_id.is.null`)
          .neq("status", "resolved")
          .order("last_seen_at", { ascending: false })
          .limit(20),
        supabase
          .from("support_tickets")
          .select("id,priority,category,subject,status,created_at")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("integrations")
          .select("provider,status,last_sync_at")
          .eq("org_id", orgId)
          .limit(50),
      ]);

    const usage = usageResult.data || [];
    const totalRequests = usage.length;
    const failedRequests = usage.filter((row: any) => row.status === "error").length;
    const blockedRequests = usage.filter((row: any) => row.status === "blocked").length;
    const totalCostMicros = usage.reduce((sum: number, row: any) => sum + Number(row.cost_micros || 0), 0);
    const totalCredits = usage.reduce((sum: number, row: any) => sum + Number(row.credits_used || 0), 0);
    const averageLatencyMs = totalRequests
      ? Math.round(usage.reduce((sum: number, row: any) => sum + Number(row.latency_ms || 0), 0) / totalRequests)
      : 0;

    const byFeature = Object.values(
      usage.reduce((acc: Record<string, any>, row: any) => {
        const key = row.feature_key || "unknown";
        acc[key] ||= { feature: key, requests: 0, credits: 0, costMicros: 0, failures: 0 };
        acc[key].requests += 1;
        acc[key].credits += Number(row.credits_used || 0);
        acc[key].costMicros += Number(row.cost_micros || 0);
        if (row.status === "error") acc[key].failures += 1;
        return acc;
      }, {}),
    );

    const connectedIntegrations = (integrationsResult.data || []).filter((item: any) =>
      ["connected", "healthy"].includes(item.status),
    ).length;

    return NextResponse.json(
      {
        organisation: { id: orgId, role: membership.role },
        subscription: subscriptionResult.data || null,
        balance: balanceResult.data || null,
        metrics: {
          totalRequests,
          failedRequests,
          blockedRequests,
          totalCredits,
          totalCostAud: totalCostMicros / 1_000_000,
          averageLatencyMs,
          errorRate: totalRequests ? Math.round((failedRequests / totalRequests) * 1000) / 10 : 0,
        },
        usageByFeature: byFeature,
        integrations: {
          connected: connectedIntegrations,
          total: integrationsResult.data?.length || 0,
          items: integrationsResult.data || [],
        },
        incidents: incidentsResult.data || [],
        tickets: ticketsResult.data || [],
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Control Centre failed" }, { status: 500 });
  }
}
