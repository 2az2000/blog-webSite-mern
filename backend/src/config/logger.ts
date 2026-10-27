/**
 * Application logger. On Vercel the process streams to stdout, so JSON logs
 * sent there surface for Datadog-style dashboards also without a file sink.
 */
import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.logLevel,
  base: undefined, // keep rows lean
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "cookies.nova_at",
      "cookies.nova_rt",
      // pino-http logs the response headers; Set-Cookie carries both tokens.
      'res.headers["set-cookie"]',
    ],
    censor: "[redacted]",
  },
});
