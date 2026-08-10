import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildLaunchReadiness } from "@/lib/launch-readiness";

export const dynamic = "force-dynamic";

function count(result: { count: number | null }) {
  return result.count ?? 0;
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
  const [
    progressResult,
    crmResult,
    knowledgeResult,
    integrationResult,
    clientResult,
    propertyResult,
    approvalResult,
    reminderResult,
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
    supabase
      .from("integrations")
      .select("provider,status")
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
      .like("action_type", "draft_approved_%"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .neq("status", "cancelled"),
  ]);

  const integrations = integrationResult.data ?? [];
  const healthyProviders = integrations.filter((integration) =>
    ["connected", "healthy"].includes(integration.status),
  );
  const connectedChannels = healthyProviders.filter(
    (integration) => integration.provider !== "crm",
  ).length;
  const calendarConnected = healthyProviders.some(
    (integration) => integration.provider === "google-calendar",
  );
  const progress = progressResult.data;
  const readiness = buildLaunchReadiness({
    profileComplete: Boolean(progress?.profile_completed),
    crmSelected: Boolean(crmResult.data),
    importComplete: Boolean(progress?.import_completed),
    knowledgeCount: count(knowledgeResult),
    connectedChannels,
    clientCount: count(clientResult),
    propertyCount: count(propertyResult),
    approvedDraftCount: count(approvalResult),
    calendarConnected,
    reminderCount: count(reminderResult),
  });
  const nextStep = readiness.steps.find((step) => !step.complete);

  return (
    <main className="space-y-6 bg-neutral-50 p-4 pb-28 md:p-6">
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
              Complete one verified business flow before inviting agents or using automation.
            </p>
          </div>
          <div className="min-w-52 rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-neutral-950">{readiness.score}</span>
              <span className="pb-1 text-neutral-500">%</span>
            </div>
            <p className="mt-1 text-sm font-medium text-neutral-600">Launch readiness</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${readiness.score}%` }} />
            </div>
            <p className="mt-2 text-xs text-neutral-500">{readiness.completed} of {readiness.steps.length} checks complete</p>
          </div>
        </div>
      </section>

      {nextStep ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Next best action</p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950">{nextStep.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{nextStep.description}</p>
          </div>
          <Link href={nextStep.href} prefetch={false} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white">
            {nextStep.action}<ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div><h2 className="font-semibold">Ready for the pilot</h2><p className="mt-1 text-sm">The core agency flow has been verified. Keep outbound automation approval-controlled during the pilot.</p></div>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {readiness.steps.map((step, index) => (
          <article key={step.key} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.complete ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                {step.complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-neutral-950">{index + 1}. {step.title}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${step.complete ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>{step.complete ? "Complete" : "Action needed"}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
                {!step.complete && <Link href={step.href} prefetch={false} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">{step.action}<ArrowRight className="h-4 w-4" /></Link>}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
