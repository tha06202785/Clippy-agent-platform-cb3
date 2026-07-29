import Link from "next/link";

export default function AccountSuspendedPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Clippy account
        </p>
        <h1 className="mt-3 text-3xl font-bold">Agency access is temporarily suspended</h1>
        <p className="mt-4 text-muted-foreground">
          Your agency workspace is on an operational hold. Contact Clippy support
          or resolve any billing issue to restore access.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link className="rounded-lg border px-4 py-2 text-sm font-medium" href="/admin/billing">
            Billing
          </Link>
          <a className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="mailto:support@useclippy.com">
            Contact support
          </a>
        </div>
      </div>
    </main>
  );
}
