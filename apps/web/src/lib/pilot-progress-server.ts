import "server-only";
import { buildPilotProgress, type PilotProgress } from "@/lib/pilot-progress";
import { isOperationalIntegration } from "@/lib/integration-status";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PilotProgressInvite = {
  id: string;
  auth_user_id: string;
  org_id: string;
};

function assertQuery(
  label: string,
  result: { error: { message?: string; code?: string } | null },
) {
  if (!result.error) return;
  throw new Error(
    `${label} lookup failed: ${result.error.code || result.error.message || "unknown error"}`,
  );
}

export async function loadPilotProgress(
  admin: AdminClient,
  invite: PilotProgressInvite,
): Promise<PilotProgress> {
  const [
    dna,
    integrations,
    integrationHealth,
    clients,
    properties,
    approvals,
    feedback,
  ] = await Promise.all([
    admin
      .from("agent_dna_sections")
      .select("id", { count: "exact", head: true })
      .eq("org_id", invite.org_id)
      .eq("user_id", invite.auth_user_id)
      .eq("status", "confirmed"),
    admin
      .from("integrations")
      .select("provider,status")
      .eq("org_id", invite.org_id),
    admin
      .from("integration_health")
      .select("provider,status,last_error")
      .eq("org_id", invite.org_id),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", invite.org_id),
    admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("org_id", invite.org_id),
    admin
      .from("ai_actions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", invite.org_id)
      .like("action_type", "draft_approved_%"),
    admin
      .from("pilot_feedback")
      .select("id", { count: "exact", head: true })
      .eq("invite_id", invite.id)
      .eq("user_id", invite.auth_user_id),
  ]);

  assertQuery("Agent DNA", dna);
  assertQuery("Integration", integrations);
  assertQuery("Integration health", integrationHealth);
  assertQuery("Client", clients);
  assertQuery("Property", properties);
  assertQuery("Approved reply", approvals);
  assertQuery("Pilot feedback", feedback);

  const healthByProvider = new Map(
    (integrationHealth.data ?? []).map((health) => [health.provider, health]),
  );
  const connected = new Set(
    (integrations.data ?? [])
      .filter((integration) => {
        const health = healthByProvider.get(integration.provider);
        return isOperationalIntegration({
          connectionStatus: integration.status,
          healthStatus: health?.status,
          lastError: health?.last_error,
        });
      })
      .map((integration) => integration.provider),
  );

  return buildPilotProgress({
    confirmedDnaSections: dna.count ?? 0,
    gmailConnected: connected.has("gmail"),
    calendarConnected: connected.has("google-calendar"),
    clientCount: clients.count ?? 0,
    propertyCount: properties.count ?? 0,
    approvedReplyCount: approvals.count ?? 0,
    feedbackCount: feedback.count ?? 0,
  });
}
