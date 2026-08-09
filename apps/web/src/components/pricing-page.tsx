import Link from "next/link";
import { ArrowRight, Building2, Check, UserRound, Users } from "lucide-react";

const engagementModels = [
  {
    icon: UserRound,
    title: "Individual workspace",
    audience: "For a single agent validating the daily workflow",
    includes: ["Today view", "Conversations", "Opportunities", "Property context"],
  },
  {
    icon: Users,
    title: "Team pilot",
    audience: "For a small team testing shared operating habits",
    includes: ["Individual workspace", "Shared agency knowledge", "Team access foundations", "Operator diagnostics"],
  },
  {
    icon: Building2,
    title: "Agency rollout",
    audience: "For principals connecting existing systems in stages",
    includes: ["Team pilot", "Integration planning", "Role design", "Measured rollout checkpoints"],
  },
];

export function PricingPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Commercial model
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Pilot scope before published pricing.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Clippy is not presenting invented plan limits or discounts. Pricing
            will be published after billing, usage enforcement, and each included
            capability are verified end to end.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {engagementModels.map(({ icon: Icon, title, audience, includes }) => (
            <section key={title} className="flex flex-col rounded-2xl border bg-card p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {audience}
              </p>
              <ul className="mt-6 space-y-3">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border bg-white p-8 text-center">
          <h2 className="text-2xl font-semibold">Start with a working workspace</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-muted-foreground">
            Create an account to inspect the current product surface. No paid plan,
            trial duration, unlimited usage, or service-level guarantee is promised
            on this page.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Create a workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
