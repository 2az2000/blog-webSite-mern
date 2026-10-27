/**
 * Vitest setup for API tests — runs BEFORE the test module (and its import
 * graph) is evaluated, so `config/env.ts` freezes correct values.
 * LOG_LEVEL=silent keeps the pino request-lines out of the test output.
 */
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_DISABLED = "1";
process.env.LOG_LEVEL = "silent";
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ?? "test-access-secret-value-0123456789abcdef";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-secret-value-0123456789abcdef";
