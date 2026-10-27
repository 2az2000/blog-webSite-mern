/**
 * Entry A — serverless. Vercel's Node runtime imports this module and calls
 * the exported app for each request. The DB connection is cached on
 * `globalThis` (see db/connect.ts) so warm invocations reuse it.
 *
 * On Vercel: Root Directory = `backend` (this file is `api/index.ts`),
 * env vars are set in the project dashboard. Rate limiting only holds across
 * invocations with the Upstash env vars set (the memory store dies per call).
 */
import { createApp } from "../src/app.js";
import { logger } from "../src/config/logger.js";
import { setDbLogger } from "../src/db/connect.js";

setDbLogger(logger);

export default createApp();
