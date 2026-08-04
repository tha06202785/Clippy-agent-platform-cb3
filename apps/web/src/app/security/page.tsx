import Link from "next/link";
import { CheckCircle2, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to home
        </Link>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Security foundations
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Controls we can explain and verify.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          Clippy is still maturing. This page describes controls implemented in the
          product today and states clearly where formal assurance work remains.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            {
              icon: LockKeyhole,
              title: "Authentication and roles",
              description:
                "Signed-in sessions are validated on the server. Organisation administration is restricted to Owner and Admin roles at both page and API boundaries.",
            },
            {
              icon: ServerCog,
              title: "Server-side secrets",
              description:
                "Automation and internal API credentials are expected as server environment variables and are not sent to the browser.",
            },
            {
              icon: ShieldCheck,
              title: "Organisation boundaries",
              description:
                "Application queries use the signed-in user's organisation membership. Database row policies remain part of the defence-in-depth model.",
            },
            {
              icon: CheckCircle2,
              title: "Operational visibility",
              description:
                "Role-protected diagnostics report authentication, database, integration, AI-provider, and automation configuration status without displaying secret values.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <section key={title} className="rounded-2xl border bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-7 text-amber-950">
          <h2 className="text-lg font-semibold">Assurance status</h2>
          <p className="mt-2 leading-7">
            Clippy does not currently claim SOC 2, ISO 27001, GDPR certification,
            Australian data residency, or completed third-party security audits.
            Certification and independent assessment will be published only after
            they are completed and can be evidenced.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy policy
          </Link>
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms of service
          </Link>
        </div>
      </main>
    </div>
  );
}
