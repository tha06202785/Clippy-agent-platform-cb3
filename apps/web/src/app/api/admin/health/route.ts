import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

type HealthState = "healthy" | "warning" | "error";

type HealthCheck = {
  key: string;
  name: string;
  status: HealthState;
  message: string;
  latencyMs?: number;
};

const elapsed = (startedAt: number) => Date.now() - startedAt;

export async function GET() {
  const checks: HealthCheck[] = [];

  try {
    const authStarted = Date.now();
    const context = await getAdminContext();
    if (context.status === "unauthenticated") {
      return NextResponse.json(
        { error: "Unauthorized", checks: [] },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (context.status === "forbidden") {
      return NextResponse.json(
        { error: "Admin access required", checks: [] },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { membership, supabase } = context;

    checks.push({
      key: "authentication",
      name: "Authentication",
      status: "healthy",
      message: "Owner or Admin session verified",
      latencyMs: elapsed(authStarted),
    });

    const dbStarted = Date.now();
    const { error: databaseError } = await supabase
      .from("user_org_roles")
      .select("org_id", { head: true, count: "exact" })
      .eq("org_id", membership.org_id);

    if (databaseError) {
      checks.push({
        key: "database",
        name: "Database",
        status: "error",
        message: databaseError.message,
        latencyMs: elapsed(dbStarted),
      });
    } else {
      checks.push({
        key: "database",
        name: "Database",
        status: "healthy",
        message: "Supabase query completed",
        latencyMs: elapsed(dbStarted),
      });
    }

    const orgId = membership.org_id;
    checks.push({
      key: "organisation",
      name: "Organisation context",
      status: orgId ? "healthy" : "warning",
      message: orgId ? "Organisation membership found" : "No organisation membership found",
    });

    if (orgId) {
      const knowledgeStarted = Date.now();
      const { count: knowledgeCount, error: knowledgeError } = await supabase
        .from("knowledge_documents")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      checks.push({
        key: "knowledge",
        name: "Knowledge base",
        status: knowledgeError ? "error" : knowledgeCount ? "healthy" : "warning",
        message: knowledgeError
          ? knowledgeError.message
          : `${knowledgeCount || 0} knowledge item${knowledgeCount === 1 ? "" : "s"} available`,
        latencyMs: elapsed(knowledgeStarted),
      });

      const integrationStarted = Date.now();
      const { data: integrations, error: integrationError } = await supabase
        .from("integrations")
        .select("provider, status, last_sync_at")
        .eq("org_id", orgId)
        .limit(50);

      const connected = integrations?.filter((item: any) =>
        ["connected", "healthy"].includes(item.status),
      ).length || 0;

      checks.push({
        key: "integrations",
        name: "Integrations",
        status: integrationError ? "error" : connected > 0 ? "healthy" : "warning",
        message: integrationError
          ? integrationError.message
          : `${connected} of ${integrations?.length || 0} integrations healthy`,
        latencyMs: elapsed(integrationStarted),
      });
    } else {
      checks.push({
        key: "knowledge",
        name: "Knowledge base",
        status: "warning",
        message: "Cannot test without organisation context",
      });
      checks.push({
        key: "integrations",
        name: "Integrations",
        status: "warning",
        message: "Cannot test without organisation context",
      });
    }

    const aiConfigured = Boolean(
      process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.OLLAMA_API_KEY ||
        process.env.OLLAMA_BASE_URL,
    );
    checks.push({
      key: "ai",
      name: "AI provider",
      status: aiConfigured ? "healthy" : "error",
      message: aiConfigured ? "AI provider configuration detected" : "No AI provider configuration detected",
    });

    checks.push({
      key: "automation",
      name: "Automation security",
      status: process.env.CRON_SECRET && process.env.INTERNAL_API_SECRET ? "healthy" : "warning",
      message:
        process.env.CRON_SECRET && process.env.INTERNAL_API_SECRET
          ? "Cron and internal API secrets configured"
          : "One or more automation secrets are missing",
    });

    const score = Math.round(
      (checks.reduce((sum, check) => {
        if (check.status === "healthy") return sum + 1;
        if (check.status === "warning") return sum + 0.5;
        return sum;
      }, 0) /
        checks.length) *
        100,
    );

    const overall: HealthState = checks.some((check) => check.status === "error")
      ? "error"
      : checks.some((check) => check.status === "warning")
        ? "warning"
        : "healthy";

    return NextResponse.json(
      {
        overall,
        score,
        checkedAt: new Date().toISOString(),
        checks,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        overall: "error",
        score: 0,
        checkedAt: new Date().toISOString(),
        checks,
        error: error?.message || "Health check failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
