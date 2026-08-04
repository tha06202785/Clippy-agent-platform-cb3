import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Clippy",
  description: "Terms governing access to and use of the Clippy service.",
  alternates: {
    canonical: "https://useclippy.com/terms",
  },
};

const contactEmail = "clippy@useclippy.com";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Effective and last updated: 30 July 2026
        </p>

        <div className="mt-10 space-y-9 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              1. Agreement to these terms
            </h2>
            <p className="mt-3">
              These terms govern access to and use of Clippy, an AI-assisted
              operating platform for real estate professionals. By creating an
              account, joining a workspace or using Clippy, you agree to these
              terms. If you use Clippy for an organisation, you confirm that you
              have authority to bind that organisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              2. Accounts and workspace administration
            </h2>
            <p className="mt-3">
              You must provide accurate account information, protect your
              credentials and promptly notify us of suspected unauthorised
              access. Workspace owners and administrators control membership,
              roles, connected services and workspace data. They are responsible
              for ensuring their users are authorised to access information
              placed in the workspace.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              3. The Clippy service
            </h2>
            <p className="mt-3">
              Clippy may provide lead management, communications, property and
              inspection workflows, knowledge tools, reporting, integrations,
              automation and AI-assisted outputs. Features may be labelled as
              pilot, beta, preview or unconfigured. We may improve, replace or
              discontinue features, and we will take reasonable steps to avoid
              material disruption where practicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              4. User data and connected services
            </h2>
            <p className="mt-3">
              You retain ownership of information you or your organisation
              provide to Clippy. You grant us the limited rights needed to host,
              process, transmit and display that information to provide, secure
              and support the service.
            </p>
            <p className="mt-3">
              If you connect Gmail, Google Calendar or another third-party
              service, you authorise Clippy to access and use data from that
              service only within the permissions granted and as described in
              our{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary hover:underline"
              >
                Privacy Policy
              </Link>
              . Your use of a third-party service remains subject to that
              provider&apos;s terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              5. Real estate and privacy responsibilities
            </h2>
            <p className="mt-3">
              You are responsible for having a lawful basis and appropriate
              notices, consents and permissions for personal information,
              communications, marketing, listings and other material entered
              into or processed through Clippy. You remain responsible for
              complying with applicable real estate, tenancy, consumer, privacy,
              anti-spam, record-keeping and professional obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              6. AI-generated and automated output
            </h2>
            <p className="mt-3">
              AI-generated content can be incomplete, incorrect or unsuitable.
              Unless a workspace has deliberately enabled an approved
              automation, output should be treated as a draft and reviewed by an
              appropriately qualified person before it is sent, published,
              recorded or relied on. Clippy does not provide legal, financial,
              valuation, property, building or other professional advice.
            </p>
            <p className="mt-3">
              You are responsible for decisions, communications and actions
              taken using Clippy, including checking factual accuracy, tone,
              recipients, legal compliance and any required human approval.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              7. Acceptable use
            </h2>
            <p className="mt-3">You must not use Clippy to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>break the law or infringe another person&apos;s rights;</li>
              <li>
                send spam, deceptive communications, unlawful discrimination,
                harassment or harmful content;
              </li>
              <li>
                access information, accounts, organisations or systems without
                authority;
              </li>
              <li>
                upload malware, interfere with security, probe vulnerabilities
                or disrupt the service;
              </li>
              <li>
                reverse engineer or misuse the service except where applicable
                law expressly permits it; or
              </li>
              <li>
                use Clippy to make a decision that legally requires meaningful
                human review without providing that review.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              8. Fees and subscriptions
            </h2>
            <p className="mt-3">
              Paid plans, usage limits, taxes, billing intervals and renewal
              terms will be shown before purchase or in an applicable order.
              Unless stated otherwise, subscriptions renew until cancelled. Fees
              already incurred are non-refundable except where required by law
              or expressly agreed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              9. Intellectual property
            </h2>
            <p className="mt-3">
              Clippy and its software, design, documentation, branding and
              service content are owned by us or our licensors. These terms give
              you a limited, non-exclusive, non-transferable and revocable right
              to use the service during your authorised subscription or pilot.
              Feedback may be used to improve Clippy without restriction or
              compensation, provided it does not identify you or disclose your
              confidential information without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              10. Confidentiality and security
            </h2>
            <p className="mt-3">
              Each party must use reasonable care to protect the other
              party&apos;s non-public confidential information and use it only
              for the relationship contemplated by these terms. This does not
              cover information that is public without breach, already lawfully
              known, independently developed or lawfully received from another
              source. Required legal disclosure is permitted where notice is
              lawful and reasonably practicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              11. Suspension and termination
            </h2>
            <p className="mt-3">
              You may stop using Clippy at any time. We may restrict or suspend
              access when reasonably necessary to protect the service or others,
              respond to unlawful or prohibited activity, address non-payment,
              or prevent a security incident. We may terminate access for a
              material breach that is not remedied within a reasonable period,
              or immediately where the breach creates serious legal, security or
              safety risk.
            </p>
            <p className="mt-3">
              On termination, your right to use Clippy ends. Provisions that by
              their nature should continue—including ownership, confidentiality,
              disclaimers, liability and dispute provisions—survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              12. Warranties and consumer rights
            </h2>
            <p className="mt-3">
              We aim to provide Clippy with reasonable care but do not promise
              that it will always be uninterrupted, error-free or suitable for
              every business purpose. Nothing in these terms excludes, restricts
              or modifies a guarantee, right or remedy that cannot lawfully be
              excluded, including applicable rights under the Australian
              Consumer Law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              13. Liability
            </h2>
            <p className="mt-3">
              To the maximum extent permitted by law, neither party is liable
              for indirect, incidental, special or consequential loss, or lost
              profit, revenue, goodwill or data, arising from these terms or the
              service. Any limitation is subject to rights and liabilities that
              cannot be limited by law. Nothing limits liability for fraud,
              wilful misconduct, breach of confidentiality, infringement of
              another party&apos;s intellectual property, or a liability that
              cannot legally be limited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              14. Governing law
            </h2>
            <p className="mt-3">
              These terms are governed by the laws of Victoria, Australia. The
              parties submit to the courts of Victoria and courts entitled to
              hear appeals from them, subject to any mandatory rights to bring a
              claim elsewhere.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              15. Changes and contact
            </h2>
            <p className="mt-3">
              We may update these terms. We will update the date above and
              provide reasonable notice of a material change where required.
              Continued use after the effective date of updated terms
              constitutes acceptance to the extent permitted by law.
            </p>
            <p className="mt-3">
              Questions about these terms can be sent to{" "}
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
            href="/privacy"
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
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
