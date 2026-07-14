"use client";

import dynamic from "next/dynamic";

const PHProvider = dynamic(
  () => import("./posthog-inner"),
  { ssr: false }
);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider>{children}</PHProvider>;
}
