/**
 * Request/User type augmentation for Express 5.
 * The express-serve-static-core module is where Router types live, so it is
 * the interface that must be widened.
 */
import type { Types } from "mongoose";

declare module "express-serve-static-core" {
  interface Request {
    /** set by requireAuth */
    auth?: { userId: Types.ObjectId; role: string };
    /** set by the rate limiter */
    rateLimit?: { limit: number; remaining: number; resetAt: number; blocked: boolean; key: string };
  }
}
