import type { Event } from "@sentry/nextjs";

export function stripSensitiveSentryData<T extends Event>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.headers;
    delete event.request.query_string;
  }
  return event;
}
