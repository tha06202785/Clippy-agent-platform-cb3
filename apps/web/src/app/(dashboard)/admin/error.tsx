"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin page error", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">Admin dashboard could not load</h1>
        <p className="mt-2 text-sm text-red-700">{error.message || "An unexpected error occurred."}</p>
        <button onClick={reset} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white">
          Try again
        </button>
      </div>
    </div>
  );
}
