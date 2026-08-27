import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function PilotEndedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <BrandLogo size={56} priority className="mx-auto" />
        <span className="mx-auto mt-6 grid h-12 w-12 place-items-center rounded-full bg-amber-100">
          <Clock3 className="h-6 w-6 text-amber-700" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Your Clippy pilot has ended</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Thanks for trying Clippy. Your workspace is preserved, but pilot
          access is now paused.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          View Clippy plans
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
