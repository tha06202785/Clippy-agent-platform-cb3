import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Clippy",
  description:
    "How Clippy collects, uses, stores, shares, and protects personal information and Google user data.",
  alternates: {
    canonical: "https://useclippy.com/privacy",
  },
};

const contactEmail = "clippy@useclippy.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to home
        </Link>

        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Effective and last updated: 30 July 2026
        </p>

        <div className="mt-10 space-y-9 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              1. About this policy
            </h2>
            <p className="mt-3">
              This policy explains how Clippy (&quot;Clippy&quot;,
              &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) handles
              personal information when people visit useclippy.com, create or
              use a Clippy workspace, contact us, or connect a third-party
              service. Clippy is an AI-assisted operating platform for real
              estate professionals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              2. Information we collect
            </h2>
            <p className="mt-3">
              Depending on the features used, we may collect:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                account and workspace information, such as names, email
                addresses, authentication identifiers, organisation membership,
                roles and preferences;
              </li>
              <li>
                real estate business information supplied by workspace users,
                including leads, contacts, properties, conversations, notes,
                tasks, inspections and agency knowledge;
              </li>
              <li>
                billing and subscription records, with payment card information
                handled by our payment provider rather than stored directly by
                Clippy;
              </li>
              <li>
                device, browser, security, diagnostic, usage and audit
                information; and
              </li>
              <li>
                information received through services that a user chooses to
                connect, as described below.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-950">
            <h2 className="text-xl font-semibold">3. Google user data</h2>
            <p className="mt-3">
              If a user connects Google, Clippy requests permission to work with
              Gmail and Google Calendar only for the user-facing integration
              features the user enables. Depending on the permissions granted,
              this can include Gmail messages and metadata, drafts and sent
              messages, Google Calendar events, and OAuth access and refresh
              tokens.
            </p>
            <p className="mt-3">
              Clippy uses this information to display or organise relevant lead
              communications, prepare or send user-authorised email, create or
              update user-authorised calendar events, maintain the connection,
              and provide related support and security.
            </p>
            <p className="mt-3 font-medium">
              Clippy&apos;s use and transfer of information received from Google
              APIs will adhere to the Google API Services User Data Policy,
              including the Limited Use requirements.
            </p>
            <p className="mt-3">
              We do not sell Google user data, use it for advertising, build
              advertising profiles from it, or use it to train general-purpose
              AI models. We do not allow people to read Google user data except
              when the user asks us to do so for support, when necessary to
              investigate abuse or a security incident, or when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              4. How we use information
            </h2>
            <p className="mt-3">We use information to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>provide, secure, maintain and improve the Clippy service;</li>
              <li>
                authenticate users and enforce workspace and role-based access;
              </li>
              <li>
                deliver requested lead, communication, property, inspection,
                knowledge, analytics and AI-assisted features;
              </li>
              <li>process subscriptions and provide customer support;</li>
              <li>
                detect errors, misuse, fraud and security threats, and keep
                audit records; and
              </li>
              <li>comply with applicable laws and enforce our terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              5. AI-assisted processing
            </h2>
            <p className="mt-3">
              When a user requests an AI-assisted feature, relevant content may
              be sent to an AI service provider to generate the requested draft,
              summary, recommendation or classification. Clippy is designed to
              limit the content sent to what is reasonably needed for that
              feature. Users remain responsible for reviewing AI-generated
              output before relying on or sending it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              6. When information is shared
            </h2>
            <p className="mt-3">
              We may disclose information to service providers that help us
              operate Clippy, such as Vercel for hosting, Supabase for database
              and authentication infrastructure, Stripe for payments, Google for
              connected Google services, and configured AI and communications
              providers. They may process information only to perform services
              for us or the user, subject to their agreements and applicable
              law.
            </p>
            <p className="mt-3">
              We may also disclose information when a user directs us to, during
              a business transfer subject to appropriate safeguards, or when
              reasonably necessary to comply with law, protect rights and
              safety, or investigate fraud, abuse or security incidents. We do
              not sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              7. Storage, security and overseas processing
            </h2>
            <p className="mt-3">
              Clippy uses technical and organisational safeguards appropriate to
              the nature of the information, including encrypted network
              connections, server-side handling of integration secrets,
              authentication controls, organisation-scoped access and
              operational logging. No online service can guarantee absolute
              security.
            </p>
            <p className="mt-3">
              Our service providers may process information in Australia, the
              United States and other locations where they operate. Privacy and
              data protection laws in those places may differ from Australian
              law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              8. Retention and deletion
            </h2>
            <p className="mt-3">
              We retain personal information only for as long as reasonably
              needed to provide the service, meet contractual and legal
              obligations, resolve disputes, maintain security and enforce
              agreements. Retention can vary according to the information and
              why it is held. Information that is no longer required is deleted
              or de-identified where reasonably practicable, subject to legal
              requirements and limited backup retention.
            </p>
            <p className="mt-3">
              A workspace owner may request workspace or account deletion by
              emailing{" "}
              <a
                href={`mailto:${contactEmail}?subject=Clippy%20data%20deletion%20request`}
                className="font-medium text-primary hover:underline"
              >
                {contactEmail}
              </a>
              . We may need to verify the requester&apos;s identity and
              authority before deleting workspace information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              9. Disconnecting Google and revoking access
            </h2>
            <p className="mt-3">
              Users can stop future Google access by disconnecting Google from
              Clippy&apos;s Integrations page or by removing Clippy&apos;s
              access in their Google Account security settings. A user can also
              request deletion of Google-derived data by contacting us. Revoking
              access stops new access but does not automatically remove
              information that must be retained for a legal or security reason.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              10. Access, correction and privacy complaints
            </h2>
            <p className="mt-3">
              Individuals may ask to access or correct personal information we
              hold about them, or make a privacy complaint, by emailing{" "}
              <a
                href={`mailto:${contactEmail}?subject=Clippy%20privacy%20request`}
                className="font-medium text-primary hover:underline"
              >
                {contactEmail}
              </a>
              . Please explain the request and provide enough information for us
              to identify the relevant account or record. We will verify
              identity where appropriate, investigate complaints and respond
              within a reasonable period.
            </p>
            <p className="mt-3">
              If an Australian privacy complaint is not resolved, an individual
              may be able to contact the Office of the Australian Information
              Commissioner at{" "}
              <a
                href="https://www.oaic.gov.au"
                className="font-medium text-primary hover:underline"
                rel="noreferrer"
              >
                oaic.gov.au
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              11. Children
            </h2>
            <p className="mt-3">
              Clippy is a business service and is not directed to children under
              18. We do not knowingly invite children to create Clippy
              workspaces.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              12. Changes and contact
            </h2>
            <p className="mt-3">
              We may update this policy as Clippy or applicable requirements
              change. We will update the date above and provide additional
              notice when a material change requires it.
            </p>
            <p className="mt-3">
              Privacy questions can be sent to{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="font-medium text-primary hover:underline"
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-5 border-t pt-7 text-sm">
          <Link
            href="/terms"
            className="font-medium text-primary hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/security"
            className="font-medium text-primary hover:underline"
          >
            Security
          </Link>
        </div>
      </main>
    </div>
  );
}
