import Link from "next/link";
import { Check, ShieldCheck, Users } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";

const agentFeatures = [
  "Gmail enquiry triage and conversation history",
  "Google Calendar inspection context",
  "Property and client context for every draft",
  "Human approval before important communication",
  "Concierge setup and a 14-day assisted proof period",
];

const teamFeatures = [
  "Everything in Founding Agent",
  "Up to five agent workspaces",
  "Shared agency knowledge and operating visibility",
  "Assisted rollout with a named onboarding contact",
];

export function PricingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Founding 20
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Win back the hours hiding in your inbox.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Start with one approval-first workflow: turn property enquiries into
            organised client context, inspection follow-ups, and safer drafts.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-2">
          <section className="flex flex-col rounded-3xl border-2 border-primary bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  For individual agents
                </p>
                <h2 className="mt-1 text-2xl font-bold">Founding Agent</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                First 20 agents
              </span>
            </div>
            <div className="mt-7 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight">A$99</span>
              <span className="pb-1 text-neutral-500">/agent/month</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Month-to-month. Founding price locked for 12 months from
              activation.
            </p>
            <ul className="mt-7 flex-1 space-y-3">
              {agentFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm leading-6"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <CheckoutButton
              plan="starter"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
            >
              Claim a Founding 20 place
            </CheckoutButton>
            <p className="mt-3 text-center text-xs text-neutral-500">
              Workspace setup comes first. Payment is confirmed separately.
            </p>
          </section>

          <section className="flex flex-col rounded-3xl border bg-white p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-semibold text-neutral-600">
              For small teams
            </p>
            <h2 className="mt-1 text-2xl font-bold">Founding Team</h2>
            <div className="mt-7 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight">A$399</span>
              <span className="pb-1 text-neutral-500">/month</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Up to five agents. Activated through assisted onboarding.
            </p>
            <ul className="mt-7 flex-1 space-y-3">
              {teamFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm leading-6"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl border-2 border-neutral-200 px-6 py-3 font-semibold transition hover:border-primary hover:text-primary"
            >
              Start an assisted team pilot
            </Link>
          </section>
        </div>

        <section className="mx-auto mt-10 flex max-w-5xl items-start gap-3 rounded-2xl border bg-white p-6">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-semibold">Approval-first by design</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              Clippy prepares and organises work; agents remain in control of
              important communication. No autonomous sending or guaranteed
              revenue outcome is included in these plans.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
