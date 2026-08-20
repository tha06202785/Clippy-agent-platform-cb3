import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildLaunchReadiness,
  buildProductionProof,
  type LaunchReadinessStep,
} from "@/lib/launch-readiness";

export const dynamic = "force-dynamic";

const PROOF_REPLY_ACTION_KEYS = [
  "new_enquiry_reply",
  "booking_link_reply",
  "no_response_follow_up",
];

function count(result: { count: number | null }) {
  return result.count ?? 0;
}

function ReadinessCards({ steps }: { steps: LaunchReadinessStep[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {steps.map((step, index) => (
        <article
          key={step.key}
          className="rounded-2xl border bg-white p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.complete ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
            >
              {step.complete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-neutral-950">
                  {index + 1}. {step.title}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${step.complete ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}
                >
                  {step.complete ? "Complete" : "Action needed"}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                {step.description}
              </p>
              {!step.complete && (
                <Link
                  href={step.href}
                  prefetch={false}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                >
                  {step.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function LaunchCentrePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) redirect("/onboarding");

  const orgId = membership.org_id;
  const admin = createAdminClient();
  const [
    progressResult,
    crmResult,
    knowledgeResult,
    integrationResult,
    integrationHealthResult,
    clientResult,
    propertyResult,
    approvalResult,
    automationApprovalResult,
    proofMessagesResult,
    proofEnquiriesResult,
    proofBookingsResult,
    proofCommunicationsResult,
    proofActivitiesResult,
  ] = await Promise.all([
    supabase
      .from("onboarding_progress")
      .select("profile_completed,import_completed")
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("integrations")
      .select("status")
      .eq("org_id", orgId)
      .eq("provider", "crm")
      .maybeSingle(),
    supabase
      .from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "indexed"),
    supabase.from("integrations").select("provider,status").eq("org_id", orgId),
    admin
      .from("integration_health")
      .select("provider,status,last_error")
      .eq("org_id", orgId),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("ai_actions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("action_type", "draft_approved_email"),
    admin
      .from("automation_approvals")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("channel", "email")
      .eq("status", "approved")
      .in("action_key", PROOF_REPLY_ACTION_KEYS),
    admin
      .from("messages")
      .select("direction_in_out,raw_json")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("property_enquiries")
      .select("source,listing_id,metadata")
      .eq("org_id", orgId)
      .order("last_activity_at", { ascending: false })
      .limit(500),
    admin
      .from("inspection_bookings")
      .select("booking_status,calendar_sync_status,confirmation_sent_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("scheduled_communications")
      .select("type,status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("clippy_activity_log")
      .select("action,completed_at")
      .eq("org_id", orgId)
      .not("completed_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const integrations = integrationResult.data ?? [];
  const integrationHealth = new Map(
    (integrationHealthResult.data ?? []).map((health) => [
      health.provider,
      health,
    ]),
  );
  const connectedProviders = integrations.filter((integration) =>
    ["connected", "healthy"].includes(integration.status),
  );
  const healthyProviders = connectedProviders.filter((integration) => {
    const health = integrationHealth.get(integration.provider);
    if (!health) return integration.status === "healthy";
    return (
      ["connected", "healthy"].includes(health.status) && !health.last_error
    );
  });
  const healthyChannels = healthyProviders.filter(
    (integration) => integration.provider !== "crm",
  );
  const calendarConnected = connectedProviders.some(
    (integration) => integration.provider === "google-calendar",
  );
  const calendarHealthy = healthyProviders.some(
    (integration) => integration.provider === "google-calendar",
  );
  const gmailConnected = connectedProviders.some(
    (integration) => integration.provider === "gmail",
  );
  const gmailHealthy = healthyProviders.some(
    (integration) => integration.provider === "gmail",
  );
  const messages = proofMessagesResult.data ?? [];
  const inboundEmailCount = messages.filter(
    (message) =>
      message.direction_in_out === "in" &&
      message.raw_json?.test_data !== true &&
      message.raw_json?.channel === "email" &&
      typeof message.raw_json?.external_message_id === "string",
  ).length;
  const deliveredApprovedEmailCount = messages.filter(
    (message) =>
      message.direction_in_out === "out" &&
      message.raw_json?.test_data !== true &&
      message.raw_json?.channel === "email" &&
      ["sent", "delivered", "read"].includes(
        String(message.raw_json?.delivery_status || ""),
      ) &&
      Boolean(
        message.raw_json?.approval_id ||
        (message.raw_json?.automation_approval_id &&
          PROOF_REPLY_ACTION_KEYS.includes(
            String(message.raw_json?.action_key || ""),
          )),
      ),
  ).length;
  const linkedGmailEnquiryCount = (proofEnquiriesResult.data ?? []).filter(
    (enquiry) =>
      enquiry.source === "gmail" &&
      enquiry.metadata?.test_data !== true &&
      Boolean(enquiry.listing_id),
  ).length;
  const bookings = proofBookingsResult.data ?? [];
  const confirmedBookingCount = bookings.filter(
    (booking) => booking.booking_status === "confirmed",
  ).length;
  const syncedCalendarBookingCount = bookings.filter(
    (booking) =>
      booking.booking_status === "confirmed" &&
      booking.calendar_sync_status === "synced",
  ).length;
  const confirmationSentCount = bookings.filter(
    (booking) =>
      booking.booking_status === "confirmed" &&
      Boolean(booking.confirmation_sent_at),
  ).length;
  const activeCommunicationStatuses = new Set([
    "scheduled",
    "processing",
    "awaiting_approval",
    "sent",
  ]);
  const communications = proofCommunicationsResult.data ?? [];
  const reminder24hCount = communications.filter(
    (communication) =>
      communication.type === "inspection_reminder_24h" &&
      activeCommunicationStatuses.has(communication.status),
  ).length;
  const reminder2hCount = communications.filter(
    (communication) =>
      communication.type === "inspection_reminder_2h" &&
      activeCommunicationStatuses.has(communication.status),
  ).length;
  const activities = proofActivitiesResult.data ?? [];
  const activityCount = (action: string) =>
    activities.filter((activity) => activity.action === action).length;
  const approvedEmailDraftCount =
    count(approvalResult) + count(automationApprovalResult);
  const progress = progressResult.data;
  const readiness = buildLaunchReadiness({
    profileComplete: Boolean(progress?.profile_completed),
    crmSelected: Boolean(crmResult.data),
    importComplete: Boolean(progress?.import_completed),
    knowledgeCount: count(knowledgeResult),
    connectedChannels: healthyChannels.length,
    clientCount: count(clientResult),
    propertyCount: count(propertyResult),
    approvedDraftCount: approvedEmailDraftCount,
    calendarConnected,
    calendarHealthy,
    reminderCount: reminder24hCount + reminder2hCount,
  });
  const productionProof = buildProductionProof({
    gmailConnected,
    gmailHealthy,
    calendarConnected,
    calendarHealthy,
    inboundEmailCount,
    linkedGmailEnquiryCount,
    approvedEmailDraftCount,
    deliveredApprovedEmailCount,
    confirmedBookingCount,
    syncedCalendarBookingCount,
    confirmationSentCount,
    reminder24hCount,
    reminder2hCount,
    gmailActivityCount: activityCount("gmail_enquiries_synced"),
    replyActivityCount: activityCount("approved_email_reply_sent"),
    bookingActivityCount: activityCount("inspection_booking_completed"),
  });
  const nextStep = readiness.steps.find((step) => !step.complete);
  const nextProofStep = nextStep
    ? undefined
    : productionProof.steps.find((step) => !step.complete);
  const nextAction = nextStep || nextProofStep;
  const totalCompleted = readiness.completed + productionProof.completed;
  const totalChecks = readiness.steps.length + productionProof.steps.length;
  const pilotScore = Math.round((totalCompleted / totalChecks) * 100);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-blue-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Rocket className="h-4 w-4" /> Pilot Agency Launch Centre
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
              Turn your Clippy workspace into a pilot-ready agency
            </h1>
            <p className="mt-2 text-neutral-600">
              Complete one verified business flow before inviting agents or
              using automation.
            </p>
          </div>
          <div className="min-w-52 rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-neutral-950">
                {pilotScore}
              </span>
              <span className="pb-1 text-neutral-500">%</span>
            </div>
            <p className="mt-1 text-sm font-medium text-neutral-600">
              Pilot readiness
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${pilotScore}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {totalCompleted} of {totalChecks} verified checks complete
            </p>
          </div>
        </div>
      </section>

      {nextAction ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              {nextStep ? "Next setup action" : "Production proof action"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              {nextAction.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {nextAction.description}
            </p>
          </div>
          <Link
            href={nextAction.href}
            prefetch={false}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            {nextAction.action}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="font-semibold">Ready for the pilot</h2>
            <p className="mt-1 text-sm">
              The full enquiry-to-booking flow has recorded real outcome
              evidence. Keep outbound automation approval-controlled during the
              pilot.
            </p>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Stage one
            </p>
            <h2 className="text-xl font-bold text-neutral-950">
              Workspace setup
            </h2>
          </div>
          <p className="text-sm font-medium text-neutral-600">
            {readiness.completed} of {readiness.steps.length} complete
          </p>
        </div>
        <ReadinessCards steps={readiness.steps} />
      </section>

      <section className="space-y-3 rounded-3xl border border-blue-100 bg-blue-50/60 p-4 md:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Stage two
            </p>
            <h2 className="text-xl font-bold text-neutral-950">
              Production proof gate
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              These checks require recorded outcomes, not connected-service
              status alone.
            </p>
          </div>
          <p className="text-sm font-semibold text-blue-800">
            {productionProof.completed} of {productionProof.steps.length} ·{" "}
            {productionProof.score}%
          </p>
        </div>
        <ReadinessCards steps={productionProof.steps} />
      </section>
    </div>
  );
}
