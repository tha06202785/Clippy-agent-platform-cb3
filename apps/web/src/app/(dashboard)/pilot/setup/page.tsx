import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { isPilotInviteActive } from "@/lib/pilot-invites";
import { loadPilotProgress } from "@/lib/pilot-progress-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function daysRemaining(value: string) {
  return Math.max(
    1,
    Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000),
  );
}

export default async function PilotSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=%2Fpilot%2Fsetup");

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("pilot_invites")
    .select("id,auth_user_id,org_id,status,expires_at,trial_ends_at")
    .eq("auth_user_id", user.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    !invite?.auth_user_id ||
    !invite.org_id ||
    !invite.trial_ends_at ||
    !isPilotInviteActive(invite)
  ) {
    redirect("/dashboard");
  }

  const progress = await loadPilotProgress(admin, {
    id: invite.id,
    auth_user_id: invite.auth_user_id,
    org_id: invite.org_id,
  });
  const complete = progress.completed === progress.total;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Private pilot
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
              {complete ? "You’re ready to test Clippy" : "Set up your pilot workspace"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">
              These steps update automatically from real activity. You never
              need to mark a task complete yourself.
            </p>
          </div>
          <div className="min-w-48 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <span className="text-3xl font-bold text-neutral-950">
                {progress.percent}%
              </span>
              <span className="pb-1 text-xs font-semibold text-neutral-500">
                {progress.completed}/{progress.total} complete
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"
              role="progressbar"
              aria-label="Pilot setup progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              {daysRemaining(invite.trial_ends_at)} days remaining
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {progress.steps.map((step, index) => (
          <article
            key={step.key}
            className={`rounded-2xl border bg-card p-5 shadow-sm ${step.complete ? "border-emerald-200" : "border-border"}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.complete ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
              >
                {step.complete ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold text-foreground">
                    {index + 1}. {step.title}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${step.complete ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                  >
                    {step.detail}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
                {!step.complete ? (
                  <Link
                    href={step.href}
                    prefetch={false}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    {step.action}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
            <h2 className="font-semibold">Help shape Clippy</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-violet-800">
            You’ve shared {progress.feedbackCount} draft feedback response
            {progress.feedbackCount === 1 ? "" : "s"}. Use the one-tap options
            under Copilot drafts whenever something feels right or wrong.
          </p>
          <Link
            href="/copilot"
            prefetch={false}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-800 hover:underline"
          >
            Open Clippy
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <h2 className="font-semibold">No payment details required</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            This private pilot remains free for the invitation period. Clippy
            will not start a paid subscription automatically.
          </p>
        </article>
      </section>
    </div>
  );
}
