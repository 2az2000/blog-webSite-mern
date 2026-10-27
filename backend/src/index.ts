/**
 * Entry B — plain Node server (local dev / Railway / any always-on host).
 * `npm run dev` runs this with tsx watch; `npm start` runs the built JS.
 */
import "dotenv/config"; // must be the first import so env.ts reads .env
import { env } from "./config/env.js";
import { connectDb, disconnectDb, setDbLogger } from "./db/connect.js";
import { logger } from "./config/logger.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  setDbLogger(logger);

  try {
    await connectDb();
  } catch (err) {
    logger.error({ err }, "Mongo connection failed — exiting");
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`NOVA API listening on http://localhost:${env.port}/api/v1 (env: ${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => void 0);
    await disconnectDb();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
