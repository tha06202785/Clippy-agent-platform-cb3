import { NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

function warning(name: string, result: QueryResult<unknown>): string | null {
  return result.error ? `${name}: ${result.error.message}` : null;
}

export async function GET() {
  try {
    const context = await getPlatformAdminContext();
    if (context.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (context.status === "forbidden") {
      return NextResponse.json({ error: "Platform administrator access required" }, { status: 403 });
    }
    if (context.status === "unavailable") {
      return NextResponse.json(
        { error: "Platform administration is not configured" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { admin } = context;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [
      organisations,
      memberships,
      subscriptions,
      usage,
      integrations,
      communications,
      incidents,
    ] = await Promise.all([
      admin
        .from("orgs")
        .select("id,name,created_at")
        .order("created_at", { ascending: false })
        .limit(250),
      admin.from("user_org_roles").select("org_id,user_id,role").limit(5000),
      admin
        .from("org_subscriptions")
        .select(
          "org_id,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id,plans(key,name,monthly_price_cents,currency)",
        )
        .limit(1000),
      admin
        .from("ai_usage_events")
        .select("org_id,credits_used,cost_micros,status,created_at")
        .gte("created_at", monthStart.toISOString())
        .limit(10000),
      admin.from("integrations").select("org_id,provider,status,last_sync_at").limit(5000),
      admin
        .from("scheduled_communications")
        .select("org_id,status,scheduled_for,sent_at,created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      admin
        .from("system_incidents")
        .select("id,org_id,severity,component,title,status,last_seen_at,occurrence_count")
        .neq("status", "resolved")
        .order("last_seen_at", { ascending: false })
        .limit(100),
    ]);

    const orgRows = organisations.data || [];
    const memberRows = memberships.data || [];
    const subscriptionRows = subscriptions.data || [];
    const usageRows = usage.data || [];
    const integrationRows = integrations.data || [];
    const communicationRows = communications.data || [];

    const activeStatuses = new Set(["active", "trialing"]);
    const activeSubscriptions = subscriptionRows.filter((row: any) =>
      activeStatuses.has(row.status),
    );
    const pastDueSubscriptions = subscriptionRows.filter(
      (row: any) => row.status === "past_due",
    );
    const mrrCents = activeSubscriptions.reduce((total: number, row: any) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return total + Number(plan?.monthly_price_cents || 0);
    }, 0);
    const failedAIRequests = usageRows.filter((row: any) => row.status === "error").length;
    const aiCostMicros = usageRows.reduce(
      (total: number, row: any) => total + Number(row.cost_micros || 0),
      0,
    );
    const unhealthyIntegrations = integrationRows.filter(
      (row: any) => !["connected", "healthy"].includes(row.status),
    );
    const failedCommunications = communicationRows.filter((row: any) =>
      ["failed", "error", "cancelled"].includes(row.status),
    );
    const queuedCommunications = communicationRows.filter((row: any) =>
      ["pending", "scheduled", "queued", "processing"].includes(row.status),
    );

    const membersByOrg = new Map<string, number>();
    for (const row of memberRows as any[]) {
      membersByOrg.set(row.org_id, (membersByOrg.get(row.org_id) || 0) + 1);
    }
    const subscriptionsByOrg = new Map(
      (subscriptionRows as any[]).map((row) => [row.org_id, row]),
    );
    const integrationsByOrg = new Map<string, { total: number; unhealthy: number }>();
    for (const row of integrationRows as any[]) {
      const current = integrationsByOrg.get(row.org_id) || { total: 0, unhealthy: 0 };
      current.total += 1;
      if (!["connected", "healthy"].includes(row.status)) current.unhealthy += 1;
      integrationsByOrg.set(row.org_id, current);
    }

    const customers = orgRows.map((org: any) => {
      const subscription = subscriptionsByOrg.get(org.id) as any;
      const plan = Array.isArray(subscription?.plans)
        ? subscription.plans[0]
        : subscription?.plans;
      return {
        id: org.id,
        name: org.name || "Unnamed organisation",
        createdAt: org.created_at,
        members: membersByOrg.get(org.id) || 0,
        plan: plan?.name || plan?.key || "No plan",
        subscriptionStatus: subscription?.status || "inactive",
        currentPeriodEnd: subscription?.current_period_end || null,
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        stripeLinked: Boolean(
          subscription?.stripe_customer_id && subscription?.stripe_subscription_id,
        ),
        integrations: integrationsByOrg.get(org.id) || { total: 0, unhealthy: 0 },
      };
    });

    const warnings = [
      warning("Organisations", organisations),
      warning("Memberships", memberships),
      warning("Subscriptions", subscriptions),
      warning("AI usage", usage),
      warning("Integrations", integrations),
      warning("Scheduled communications", communications),
      warning("Incidents", incidents),
    ].filter(Boolean);

    return NextResponse.json(
      {
        metrics: {
          organisations: orgRows.length,
          users: new Set(memberRows.map((row: any) => row.user_id)).size,
          activeSubscriptions: activeSubscriptions.length,
          pastDueSubscriptions: pastDueSubscriptions.length,
          mrrAud: mrrCents / 100,
          aiRequestsThisMonth: usageRows.length,
          failedAIRequests,
          aiCostAud: aiCostMicros / 1_000_000,
          integrations: integrationRows.length,
          unhealthyIntegrations: unhealthyIntegrations.length,
          queuedCommunications: queuedCommunications.length,
          failedCommunications: failedCommunications.length,
          openIncidents: incidents.data?.length || 0,
        },
        customers,
        unhealthyIntegrations: unhealthyIntegrations.slice(0, 50),
        failedCommunications: failedCommunications.slice(0, 50),
        incidents: incidents.data || [],
        warnings,
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Platform overview failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
