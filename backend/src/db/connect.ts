/**
 * Serverless-safe Mongo connection.
 *
 * - Plain Node (entry B): called once at boot; the cached promise is simply
 *   resolved.
 * - Serverless (entry A): each function invocation may start with a cold
 *   global scope, so the middleware awaits `connectDb()` before any DB work;
 *   within a warm invocation this is a resolved promise (microsecond cost).
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";

type Cache = { __novaMongoose?: Promise<typeof mongoose> };
const cache = globalThis as Cache;

mongoose.set("strictQuery", true);

export function connectDb(): Promise<typeof mongoose> {
  cache.__novaMongoose ??= mongoose
    .connect(env.mongoUrl)
    .then((m) => {
      getLog()?.info("MongoDB connected");
      return m;
    })
    .catch((err) => {
      cache.__novaMongoose = undefined;
      throw err;
    });
  return cache.__novaMongoose;
}

export async function disconnectDb(): Promise<void> {
  cache.__novaMongoose = undefined;
  await mongoose.disconnect();
}

/** Late-bound logger to avoid a circular import with app.ts. */
type LogLike = { info: (msg: string) => void; error: (msg: string) => void };
let logger: LogLike | null | undefined;

export function setDbLogger(l: LogLike | null): void {
  logger = l;
}

function getLog(): LogLike | null {
  return logger ?? null;
}
