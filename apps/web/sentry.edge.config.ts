// This file configures the initialization of Sentry on the edge.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "production",
  tracesSampleRate: 0.1,
  debug: false,
});
