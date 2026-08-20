"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@clippy/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] p-6">
      <ErrorState
        title="Admin dashboard could not load"
        description={error.message || "An unexpected error occurred."}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
