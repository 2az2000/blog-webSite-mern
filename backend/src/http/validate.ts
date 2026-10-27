/** Validation seams: parse with a zod schema, continue or fail 400 VALIDATION_ERROR. */
import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { badRequest } from "./errors.js";

const issuesOf = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
  error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));

/** Replaces `req.body` with the parsed value (unknown keys stripped). */
export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(badRequest("Validation failed", "VALIDATION_ERROR", issuesOf(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Parses the query string into `res.locals.query`. (Express 5 makes `req.query`
 * a read-only getter, so the parsed value cannot be written back to it.)
 */
export function validateQuery(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(badRequest("Validation failed", "VALIDATION_ERROR", issuesOf(result.error)));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
