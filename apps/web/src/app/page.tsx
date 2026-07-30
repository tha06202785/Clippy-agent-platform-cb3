import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const workflow = [
  {
    number: "01",
    title: "See what needs attention",
    description:
      "Start with a daily view of new conversations, overdue follow-ups, and opportunities that need a decision.",
  },
  {
    number: "02",
    title: "Work from shared context",
    description:
      "Use property, contact, and agency knowledge to prepare a useful next action without searching across separate tools.",
  },
  {
    number: "03",
    title: "Keep people in control",
    description:
      "Review important communication and policy-sensitive work before it is sent or recorded.",
  },
];

const capabilities = [
  {
    icon: Inbox,
    title: "Today",
    description: "A prioritised operating view for the work that cannot wait.",
  },
  {
    icon: MessageSquareText,
    title: "Conversations",
    description:
      "Enquiries and follow-ups organised around the people involved.",
  },
  {
    icon: Layers3,
    title: "Opportunities",
    description:
      "A practical pipeline that connects conversations to next actions.",
  },
  {
    icon: Building2,
    title: "Properties",
    description:
      "Property context available where a response or decision is made.",
  },
  {
    icon: BookOpen,
    title: "Agency brain",
    description:
      "Organisation knowledge used to ground drafts and recommendations.",
  },
  {
    icon: ShieldCheck,
    title: "Operations",
    description:
      "Role-protected diagnostics, usage, integrations, and incident visibility.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-hero text-neutral-800">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Clippy home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="h-6 w-6 text-white" />
            </span>
            <span className="text-xl font-bold">Clippy</span>
          </Link>

          <nav
            aria-label="Mobile navigation"
            className="flex items-center md:hidden"
          >
            <Link
              href="/sign-in"
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-primary hover:text-primary"
            >
              Sign in
            </Link>
          </nav>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 text-sm font-medium text-neutral-600 md:flex"
          >
            <Link
              href="#workflow"
              className="transition-colors hover:text-primary"
            >
              How it works
            </Link>
            <Link
              href="#capabilities"
              className="transition-colors hover:text-primary"
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className="transition-colors hover:text-primary"
            >
              Pricing
            </Link>
            <Link
              href="/security"
              className="transition-colors hover:text-primary"
            >
              Security
            </Link>
            <Link
              href="/sign-in"
              className="transition-colors hover:text-primary"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-5 py-2.5 text-white transition hover:bg-primary/90"
            >
              Create workspace
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-6 pb-24 pt-24 md:pb-32 md:pt-32">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
              <Sparkles className="h-4 w-4" />
              An operating layer for Australian real estate teams
            </div>
            <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Turn every enquiry into a clear next action.
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-neutral-600 md:text-xl">
              Clippy brings conversations, opportunities, properties, and agency
              knowledge into one workspace—so agents can respond with context
              and principals can see what needs attention.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-semibold text-white transition hover:bg-primary/90"
              >
                Create a workspace
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/demo"
                className="rounded-xl border-2 border-neutral-200 bg-white px-7 py-3.5 font-semibold transition hover:border-primary hover:text-primary"
              >
                Explore the product
              </Link>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {[
                "Human approval controls",
                "Organisation-scoped access",
                "Live operator diagnostics",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border bg-white/80 px-4 py-3 text-sm font-medium"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y bg-white px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                One working rhythm
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                Know what happened, decide what matters, keep work moving.
              </h2>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {workflow.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border bg-neutral-50 p-7"
                >
                  <span className="text-sm font-bold text-primary">
                    {step.number}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-neutral-600">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="capabilities" className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Focused product surface
                </p>
                <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                  Six places to run the day—not sixty disconnected features.
                </h2>
              </div>
              <p className="max-w-md leading-7 text-neutral-600">
                Clippy is being built as a hybrid layer around the systems an
                agency already uses, with new modules enabled only when their
                live data source and controls are ready.
              </p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-2xl border bg-white p-7 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-neutral-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-neutral-900 px-6 py-24 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
                Trust starts with honest product behaviour.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
                We label empty and unconfigured states, protect administration
                on the server, keep automation secrets out of the browser, and
                avoid presenting sample metrics as customer results.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-7">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-emerald-300" />
                <h3 className="font-semibold">What Clippy does not claim</h3>
              </div>
              <p className="mt-4 leading-7 text-neutral-300">
                Formal certifications, guaranteed response times, customer
                counts, and measured business outcomes will appear here only
                when evidence is available to support them.
              </p>
              <Link
                href="/security"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Read the security foundations
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Build the agency operating rhythm in one place.
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-600">
              Start with the work Clippy can support today, then connect
              additional channels and controls as your workspace grows.
            </p>
            <Link
              href="/signup"
              className="mt-9 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-semibold text-white transition hover:bg-primary/90"
            >
              Create a workspace
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-sm text-neutral-600 md:flex-row">
          <div className="flex items-center gap-2 font-semibold text-neutral-800">
            <Sparkles className="h-4 w-4 text-primary" />
            Clippy
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary">
              Terms
            </Link>
            <Link href="/security" className="hover:text-primary">
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
