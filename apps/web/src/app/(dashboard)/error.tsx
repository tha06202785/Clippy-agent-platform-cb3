"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button, ErrorState } from "@clippy/ui";

export default function DashboardError({
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
    <ErrorState
      title="This page could not load"
      description="Your data is safe. Try the page again, or return to Today if the problem continues."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
