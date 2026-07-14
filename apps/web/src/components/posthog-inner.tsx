"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export default function PostHogInner({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      loaded: (ph) => {
        if (process.env.NODE_ENV !== "production") ph.opt_out_capturing();
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
