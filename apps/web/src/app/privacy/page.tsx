import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Privacy notice</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Information used by the product
            </h2>
            <p className="mt-2">
              Clippy processes account details needed for authentication and
              organisation access. Depending on the features you use, a workspace
              may also contain contacts, leads, property information,
              communications, and agency knowledge supplied by its users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Purpose</h2>
            <p className="mt-2">
              Workspace information is used to provide the selected product
              features, including communication drafting, pipeline views, property
              context, and operational diagnostics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Infrastructure providers
            </h2>
            <p className="mt-2">
              Hosting, authentication, database, billing, integration, and
              AI-processing providers may process the information required to
              deliver their part of the service. The exact provider list and
              subprocessors must be published before a broad external rollout.
            </p>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="font-semibold">Notice status</h2>
            <p className="mt-2">
              This is an interim product notice, not a complete external privacy
              policy. A verified company identity, privacy contact, retention
              schedule, subprocessors, cross-border processing details, and request
              procedure still need legal review and publication before the product
              is opened beyond controlled pilots.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
