/**
 * The one error type crossing service boundaries.
 * Controllers and services throw `AppError`; the error middleware turns it
 * into the standard `{ error: { code, message, details? } }` envelope.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* — Common constructors ————————————————————————————————— */

export const badRequest = (message = "Invalid request", code = "BAD_REQUEST", details?: unknown) =>
  new AppError(400, code, message, details);

export const unauthorized = (message = "Authentication required", code = "UNAUTHORIZED") =>
  new AppError(401, code, message);

export const forbidden = (message = "You are not allowed to do this", code = "FORBIDDEN") =>
  new AppError(403, code, message);

export const notFound = (message = "Not found", code = "NOT_FOUND") => new AppError(404, code, message);

export const conflict = (message: string, code: string, details?: unknown) => new AppError(409, code, message, details);

export const tooManyRequests = (message = "Too many requests, slow down", code = "RATE_LIMITED", retryAfterSeconds?: number) =>
  new AppError(429, code, message, retryAfterSeconds === undefined ? undefined : { retryAfterSeconds });
