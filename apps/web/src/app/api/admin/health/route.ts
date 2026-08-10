import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  getGoogleOAuthConfig,
  getGoogleOAuthRedirectUri,
} from "@/lib/google-oauth-config";

export const dynamic = "force-dynamic";

type HealthState = "healthy" | "warning" | "error";

type HealthCheck = {
  key: string;
  name: string;
  status: HealthState;
  message: string;
  latencyMs?: number;
};

const buildInfo = () => ({
  commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "local",
  commitRef: process.env.VERCEL_GIT_COMMIT_REF || "local",
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "local",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
});

const elapsed = (startedAt: number) => Date.now() - startedAt;

const REAL_ESTATE_TERMS = [
  "property",
  "inspection",
  "inspect",
  "open home",
  "open house",
  "listing",
  "buyer",
  "buying",
  "vendor",
  "selling",
  "rental",
  "rent",
  "lease",
  "tenant",
  "apartment",
  "townhouse",
  "auction",
  "offer",
  "real estate",
  "enquiry",
  "inquiry",
  "domain.com.au",
  "realestate.com.au",
];

const NON_LEAD_TERMS = [
  "unsubscribe",
  "newsletter",
  "receipt",
  "invoice",
  "security alert",
  "password",
  "verification code",
  "one-time code",
  "order confirmation",
  "delivery update",
  "statement available",
  "marketing preferences",
];

function isRelevantStoredEmail(document: any) {
  const metadata = document.source_metadata || {};
  const email = String(metadata.email_address || "");
  const content =
    `${document.title || ""} ${metadata.body || ""}`.toLowerCase();
  if (!email || /^(no-?reply|notifications?|mailer-daemon)@/i.test(email)) {
    return false;
  }
  if (NON_LEAD_TERMS.some((term) => content.includes(term))) return false;
  return REAL_ESTATE_TERMS.some((term) => content.includes(term));
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const build = buildInfo();

  try {
    const authStarted = Date.now();
    const context = await getAdminContext();
    if (context.status === "unauthenticated") {
      return NextResponse.json(
        { error: "Unauthorized", checks: [] },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (context.status === "unavailable") {
      return NextResponse.json(
        {
          error: "Authentication is not configured for this environment",
          checks: [],
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (context.status === "forbidden") {
      return NextResponse.json(
        { error: "Admin access required", checks: [] },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { membership, supabase } = context;
    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "Organisation admin access required", checks: [] },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    checks.push({
      key: "authentication",
      name: "Authentication",
      status: "healthy",
      message: "Owner or Admin session verified",
      latencyMs: elapsed(authStarted),
    });

    const unexpectedProductionRef =
      build.environment === "production" && build.commitRef !== "main";
    checks.push({
      key: "release",
      name: "Production release",
      status: unexpectedProductionRef ? "error" : "healthy",
      message: unexpectedProductionRef
        ? `Production was built from ${build.commitRef}, not main`
        : `${build.commitRef} @ ${build.commitSha.slice(0, 7)} (${build.environment})`,
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
      message: orgId
        ? "Organisation membership found"
        : "No organisation membership found",
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
        status: knowledgeError
          ? "error"
          : knowledgeCount
            ? "healthy"
            : "warning",
        message: knowledgeError
          ? knowledgeError.message
          : `${knowledgeCount || 0} knowledge item${knowledgeCount === 1 ? "" : "s"} available`,
        latencyMs: elapsed(knowledgeStarted),
      });

      const integrationStarted = Date.now();
      const { data: integrations, error: integrationError } = await supabase
        .from("integrations")
        .select("provider, status")
        .eq("org_id", orgId)
        .limit(50);

      const connected =
        integrations?.filter((item: any) =>
          ["connected", "healthy"].includes(item.status),
        ).length || 0;

      checks.push({
        key: "integrations",
        name: "Integrations",
        status: integrationError
          ? "error"
          : connected > 0
            ? "healthy"
            : "warning",
        message: integrationError
          ? integrationError.message
          : `${connected} of ${integrations?.length || 0} integrations healthy`,
        latencyMs: elapsed(integrationStarted),
      });

      const qaStarted = Date.now();
      const [
        leadsResult,
        enquiriesResult,
        conversationsResult,
        tasksResult,
        emailKnowledgeResult,
        automationResult,
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("id,email,phone")
          .eq("org_id", orgId)
          .limit(2000),
        supabase
          .from("property_enquiries")
          .select("id,lead_id,listing_id")
          .eq("org_id", orgId)
          .limit(2000),
        supabase
          .from("conversations")
          .select("id,lead_id,listing_id,enquiry_id")
          .eq("org_id", orgId)
          .limit(2000),
        supabase
          .from("tasks")
          .select("id,status,due_at,lead_id,listing_id")
          .eq("org_id", orgId)
          .limit(2000),
        supabase
          .from("knowledge_documents")
          .select("id,title,status,source_metadata")
          .eq("org_id", orgId)
          .eq("source", "email")
          .limit(2000),
        supabase
          .from("automation_settings")
          .select("ai_paused,pause_reason")
          .eq("org_id", orgId)
          .maybeSingle(),
      ]);

      const leads = leadsResult.data || [];
      checks.push({
        key: "client-360-data",
        name: "Client 360 data",
        status: leadsResult.error
          ? "error"
          : leads.length > 0
            ? "healthy"
            : "warning",
        message: leadsResult.error
          ? leadsResult.error.message
          : leads.length > 0
            ? `${leads.length} client record${leads.length === 1 ? "" : "s"} available to Client 360`
            : "No client records are available to exercise Client 360",
        latencyMs: elapsed(qaStarted),
      });

      const enquiries = enquiriesResult.data || [];
      const invalidEnquiries = enquiries.filter(
        (enquiry: any) => !enquiry.lead_id || !enquiry.listing_id,
      );
      const propertiesByLead = new Map<string, Set<string>>();
      for (const enquiry of enquiries as any[]) {
        if (!enquiry.lead_id || !enquiry.listing_id) continue;
        const listings = propertiesByLead.get(enquiry.lead_id) || new Set();
        listings.add(enquiry.listing_id);
        propertiesByLead.set(enquiry.lead_id, listings);
      }
      const multiPropertyClients = [...propertiesByLead.values()].filter(
        (listings) => listings.size > 1,
      ).length;
      checks.push({
        key: "property-separation",
        name: "Property context separation",
        status:
          enquiriesResult.error || invalidEnquiries.length
            ? "error"
            : enquiries.length
              ? "healthy"
              : "warning",
        message: enquiriesResult.error
          ? enquiriesResult.error.message
          : invalidEnquiries.length
            ? `${invalidEnquiries.length} enquiries are missing a client or property link`
            : enquiries.length
              ? `${enquiries.length} valid client-property links; ${multiPropertyClients} multi-property clients kept separate`
              : "No property enquiries are available to exercise context separation",
      });

      const conversations = conversationsResult.data || [];
      const enquiryById = new Map(
        (enquiries as any[]).map((enquiry) => [enquiry.id, enquiry]),
      );
      const unlinkedConversations = (conversations as any[]).filter(
        (conversation) => !conversation.lead_id,
      );
      const contextMismatches = (conversations as any[]).filter(
        (conversation) => {
          if (!conversation.enquiry_id) return false;
          const enquiry = enquiryById.get(conversation.enquiry_id);
          return (
            !enquiry ||
            enquiry.lead_id !== conversation.lead_id ||
            (conversation.listing_id &&
              enquiry.listing_id !== conversation.listing_id)
          );
        },
      );
      checks.push({
        key: "copilot-context",
        name: "Copilot conversation context",
        status:
          conversationsResult.error || enquiriesResult.error
            ? "error"
            : unlinkedConversations.length || contextMismatches.length
              ? "error"
              : conversations.length
                ? "healthy"
                : "warning",
        message: conversationsResult.error
          ? conversationsResult.error.message
          : enquiriesResult.error
            ? enquiriesResult.error.message
            : unlinkedConversations.length || contextMismatches.length
              ? `${unlinkedConversations.length} unlinked conversations; ${contextMismatches.length} property-context mismatches`
              : conversations.length
                ? `${conversations.length} conversations retain consistent client and property context`
                : "No conversations are available to exercise Copilot context",
      });

      const tasks = tasksResult.data || [];
      const activeTasks = (tasks as any[]).filter(
        (task) => !["completed", "cancelled"].includes(task.status),
      );
      const invalidTasks = activeTasks.filter(
        (task) => !task.due_at || (!task.lead_id && !task.listing_id),
      );
      checks.push({
        key: "follow-up-workflow",
        name: "Follow-up workflow",
        status:
          tasksResult.error || invalidTasks.length
            ? "error"
            : tasks.length
              ? "healthy"
              : "warning",
        message: tasksResult.error
          ? tasksResult.error.message
          : invalidTasks.length
            ? `${invalidTasks.length} active follow-ups are missing a due date or CRM link`
            : tasks.length
              ? `${activeTasks.length} active follow-ups have valid due dates and CRM context`
              : "No follow-ups are available to exercise reminder controls",
      });

      const identityCounts = new Map<string, number>();
      for (const lead of leads as any[]) {
        const identities = [
          lead.email ? `email:${String(lead.email).trim().toLowerCase()}` : "",
          lead.phone ? `phone:${String(lead.phone).replace(/\D/g, "")}` : "",
        ].filter((identity) => identity.length > 0 && !identity.endsWith(":"));
        for (const identity of new Set(identities)) {
          identityCounts.set(identity, (identityCounts.get(identity) || 0) + 1);
        }
      }
      const duplicateIdentities = [...identityCounts.values()].filter(
        (count) => count > 1,
      ).length;
      checks.push({
        key: "crm-duplicate-protection",
        name: "CRM duplicate protection",
        status: leadsResult.error
          ? "error"
          : duplicateIdentities
            ? "warning"
            : leads.length
              ? "healthy"
              : "warning",
        message: leadsResult.error
          ? leadsResult.error.message
          : duplicateIdentities
            ? `${duplicateIdentities} repeated email or phone identities need review before the next import`
            : leads.length
              ? "No duplicate email or phone identities detected"
              : "No client records are available for duplicate analysis",
      });

      const emailDocuments = emailKnowledgeResult.data || [];
      const irrelevantIndexedEmails = (emailDocuments as any[]).filter(
        (document) =>
          document.status === "indexed" && !isRelevantStoredEmail(document),
      );
      checks.push({
        key: "knowledge-email-filter",
        name: "Gmail knowledge filtering",
        status:
          emailKnowledgeResult.error || irrelevantIndexedEmails.length
            ? "error"
            : emailDocuments.length
              ? "healthy"
              : "warning",
        message: emailKnowledgeResult.error
          ? emailKnowledgeResult.error.message
          : irrelevantIndexedEmails.length
            ? `${irrelevantIndexedEmails.length} indexed emails fail the real-estate relevance policy`
            : emailDocuments.length
              ? `${emailDocuments.length} stored emails comply with the relevance policy`
              : "No Gmail knowledge is stored; reconnect and sync when you are home",
      });

      checks.push({
        key: "automation-pause-state",
        name: "Automation pause state",
        status: automationResult.error ? "error" : "healthy",
        message: automationResult.error
          ? automationResult.error.message
          : automationResult.data?.ai_paused
            ? `Agency-wide automation is paused${automationResult.data.pause_reason ? `: ${automationResult.data.pause_reason}` : ""}`
            : "Agency-wide automation is active; Copilot replies remain approval-controlled",
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
      message: aiConfigured
        ? "AI provider configuration detected"
        : "No AI provider configuration detected",
    });

    const missingAutomationSecrets = [
      !process.env.CRON_SECRET ? "CRON_SECRET" : null,
      !process.env.INTERNAL_API_SECRET ? "INTERNAL_API_SECRET" : null,
    ].filter((key): key is string => Boolean(key));

    checks.push({
      key: "automation",
      name: "Automation security",
      status: missingAutomationSecrets.length ? "warning" : "healthy",
      message: missingAutomationSecrets.length
        ? `Missing production secret${missingAutomationSecrets.length === 1 ? "" : "s"}: ${missingAutomationSecrets.join(", ")}`
        : "Cron and internal API secrets configured",
    });

    try {
      getGoogleOAuthConfig();
      checks.push({
        key: "google-oauth",
        name: "Google OAuth",
        status: "healthy",
        message: `Credentials validated for ${getGoogleOAuthRedirectUri()}`,
      });
    } catch (error) {
      checks.push({
        key: "google-oauth",
        name: "Google OAuth",
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Google OAuth configuration is invalid",
      });
    }

    const score = Math.round(
      (checks.reduce((sum, check) => {
        if (check.status === "healthy") return sum + 1;
        if (check.status === "warning") return sum + 0.5;
        return sum;
      }, 0) /
        checks.length) *
        100,
    );

    const overall: HealthState = checks.some(
      (check) => check.status === "error",
    )
      ? "error"
      : checks.some((check) => check.status === "warning")
        ? "warning"
        : "healthy";

    return NextResponse.json(
      {
        overall,
        score,
        checkedAt: new Date().toISOString(),
        build,
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
        build,
        checks,
        error: error?.message || "Health check failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
