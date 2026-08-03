import * as Sentry from "@sentry/nextjs";
import { stripSensitiveSentryData } from "@/lib/sentry";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  beforeSend: stripSensitiveSentryData,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05)
});
