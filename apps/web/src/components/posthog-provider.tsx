"use client";

import dynamic from "next/dynamic";

const PostHogInner = dynamic(() => import("./posthog-inner"), { ssr: false });

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogInner>{children}</PostHogInner>;
}
