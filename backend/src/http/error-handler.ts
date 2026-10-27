/**
 * Unified error mapping. Everything a handler throws — AppError, ZodError,
 * Mongoose errors, body-parser JSON errors — funnels through here and leaves
 * with the standard envelope `{ error: { code, message, details? } }`.
 */
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { reportError } from "../config/sentry.js";
import { AppError } from "./errors.js";

type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

function toBody(err: AppError): ErrorBody {
  return {
    error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) },
  };
}

function isBodyParseError(err: unknown): err is Error & { type?: string; status?: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.parse.failed"
  );
}

function logUnexpected(err: unknown, req: Request): void {
  // pino-http has already attached req.log
  const log = (req as Request & { log?: { error(obj: unknown, msg: string): void } }).log;
  const payload =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { thrown: err };
  if (log) log.error(payload, "unhandled error");
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // Errors after headers were sent cannot be re-shaped; delegate.
  if (res.headersSent) {
    next(err);
    return;
  }

  // a route may have marked its success response cacheable; an error must never be
  res.setHeader("Cache-Control", "no-store");

  if (err instanceof AppError) {
    const body = toBody(err);
    if (err.code === "RATE_LIMITED" && typeof (err.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds === "number") {
      res.setHeader("Retry-After", String((err.details as { retryAfterSeconds: number }).retryAfterSeconds));
    }
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message, code: i.code })),
      },
    });
    return;
  }

  if (isBodyParseError(err)) {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
    return;
  }

  // Mongoose duplicates etc. — map the well-known ones, log the rest.
  if (typeof err === "object" && err !== null && "name" in err) {
    const name = (err as { name?: string }).name;
    if (name === "ValidationError") {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Document validation failed" } });
      return;
    }
  }

  if (!env.isTest) logUnexpected(err, req);
  reportError(err, { method: req.method, url: req.originalUrl });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
}

/** 404 fallback for unknown /api routes. */
export function apiNotFound(req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route matches ${req.method} ${req.originalUrl}` } });
}
