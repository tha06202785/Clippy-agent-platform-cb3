import Link from "next/link";
import { ArrowRight, BookOpen, Inbox, Layers3, Sparkles } from "lucide-react";

const tour = [
  {
    icon: Inbox,
    title: "Today",
    description: "Review new activity and work that needs a decision.",
  },
  {
    icon: Layers3,
    title: "Opportunities",
    description: "Keep the next action visible as conversations progress.",
  },
  {
    icon: BookOpen,
    title: "Agency brain",
    description: "Add the organisation context used to support better drafts.",
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-20 text-white">
      <main className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">
          &larr; Back to home
        </Link>
        <div className="mt-14 max-w-3xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="mt-7 text-4xl font-bold tracking-tight md:text-6xl">
            Explore the current Clippy workflow.
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-300">
            A recorded customer demo is not available yet. This product tour shows
            the three core surfaces being prepared for pilot teams without
            presenting scripted activity as live customer results.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {tour.map(({ icon: Icon, title, description }) => (
            <section key={title} className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <Icon className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-950 hover:bg-emerald-400"
          >
            Create a workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/5"
          >
            View commercial model
          </Link>
        </div>
      </main>
    </div>
  );
}
