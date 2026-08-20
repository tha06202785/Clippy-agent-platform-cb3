"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@clippy/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-xl">
            <h1 className="text-2xl font-semibold">
              Clippy needs a fresh start
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We recorded the error. Reload the application to continue; no
              approved action was sent automatically.
            </p>
            <Button className="mt-6" onClick={reset}>
              Reload Clippy
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
