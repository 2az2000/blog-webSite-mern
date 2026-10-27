/**
 * Error reporting (Sentry) — optional. With no `SENTRY_DSN` every function here
 * does nothing, so development and tests are unaffected.
 *
 * Only unexpected failures (HTTP 5xx) are reported. Request bodies, cookies and
 * authorization headers are never attached.
 */
import * as Sentry from "@sentry/node";
import { env } from "./env.js";

let started = false;

export function initSentry(): void {
  if (started || !env.sentryDsn) return;
  started = true;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    // an API of this size does not need performance tracing; errors only
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
}

/** Reports an unexpected error with the route it happened on. Never throws. */
export function reportError(err: unknown, context: { method?: string; url?: string } = {}): void {
  if (!started) return;
  try {
    Sentry.withScope((scope) => {
      if (context.method || context.url) scope.setTag("route", `${context.method ?? ""} ${(context.url ?? "").split("?")[0]}`.trim());
      Sentry.captureException(err);
    });
    // a serverless function may be frozen the moment it answers: give the report a moment to leave
    void Sentry.flush(2000);
  } catch {
    // reporting must never be the thing that breaks a response
  }
}
