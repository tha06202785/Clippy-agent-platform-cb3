"use client";

import { useEffect, type ReactNode } from "react";

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

  return children;
}
