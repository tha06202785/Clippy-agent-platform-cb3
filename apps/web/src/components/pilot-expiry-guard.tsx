"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

const MAX_TIMEOUT_MS = 2_147_000_000;

export function PilotExpiryGuard({
  children,
  expiresAt,
}: {
  children: ReactNode;
  expiresAt: string;
}) {
  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    let timeout: number | undefined;
    const expire = () => {
      void fetch("/api/pilot/expire", { method: "POST" }).finally(() => {
        window.location.assign("/pilot/ended");
      });
    };
    const schedule = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        expire();
        return;
      }
      timeout = window.setTimeout(
        schedule,
        Math.min(remaining + 1_000, MAX_TIMEOUT_MS),
      );
    };
    schedule();
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [expiresAt]);

  const endDate = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Melbourne",
  }).format(new Date(expiresAt));

  return (
    <>
      <aside className="mb-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Private pilot</strong> · free access ends {endDate}
          </span>
        </div>
        <Link
          href="/pilot/setup"
          prefetch={false}
          className="inline-flex items-center gap-1.5 font-semibold text-violet-800 hover:underline"
        >
          View setup checklist
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
      {children}
    </>
  );
}
