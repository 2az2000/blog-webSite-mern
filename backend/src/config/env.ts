/**
 * The single validated environment.
 * Every variable the app needs is declared here — anything process.env.*
 * other than in this file is a bug.
 */
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

/** Dev/test-only fallbacks so a fresh clone runs without secrets. */
const DEV_FALLBACK_ACCESS = "dev-access-secret-change-me-0123456789abcdef";
const DEV_FALLBACK_REFRESH = "dev-refresh-secret-change-me-0123456789abcdef";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URL: z.string().min(1, "MONGO_URL is required").default("mongodb://127.0.0.1:27017/nova"),

  ACCESS_TOKEN_SECRET: z.string().default(DEV_FALLBACK_ACCESS),
  REFRESH_TOKEN_SECRET: z.string().default(DEV_FALLBACK_REFRESH),
  /** seconds for the access JWT */
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? isProd : v !== "false" && v !== "0")),

  WEB_APP_URL: z.string().startsWith("http", "WEB_APP_URL must be an absolute URL").default("http://localhost:3000"),

  RESEND_API_KEY: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  EMAIL_FROM: z.string().default("NOVA <onboarding@resend.dev>"),

  UPSTASH_REDIS_REST_URL: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),

  /** Extra origins allowed to make cookie-authenticated writes (comma-separated), besides WEB_APP_URL — e.g. a www/apex twin or a custom domain. */
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])),
  /** Error reporting; unset = off. */
  SENTRY_DSN: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),

  /** Shared secret for the web revalidation webhook; unset = webhook off. */
  REVALIDATE_SECRET: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  /** Bearer secret Vercel Cron presents to /internal/publish-due; unset = endpoint closed. */
  CRON_SECRET: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),

  CLOUDINARY_CLOUD_NAME: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  CLOUDINARY_API_KEY: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  CLOUDINARY_API_SECRET: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  /** The Cloudinary folder uploads land in. Empty or unset = `nova`. */
  CLOUDINARY_FOLDER: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "nova"))
    .pipe(z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lower-case letters, digits, - and _")),

  RATE_LIMIT_DISABLED: z.string().optional().transform((v) => v === "1" || v === "true"),

  INITIAL_ADMIN_EMAIL: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  INITIAL_ADMIN_PASSWORD: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
   
  console.error("✗ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
     
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

const rawEnv = parsed.data;

/** Production must never run on the development fallback secrets. */
if (isProd && !isTest) {
  const weak = [
    rawEnv.ACCESS_TOKEN_SECRET === DEV_FALLBACK_ACCESS,
    rawEnv.REFRESH_TOKEN_SECRET === DEV_FALLBACK_REFRESH,
    rawEnv.ACCESS_TOKEN_SECRET.length < 32,
    rawEnv.REFRESH_TOKEN_SECRET.length < 32,
  ].some(Boolean);
  if (weak) {
     
    console.error(
      "✗ ACCESS_TOKEN_SECRET / REFRESH_TOKEN_SECRET must be set to unique values of at least 32 characters in production.",
    );
    process.exit(1);
  }
}

export const env = {
  isProd,
  isTest,

  nodeEnv: rawEnv.NODE_ENV,
  port: rawEnv.PORT,

  mongoUrl: rawEnv.MONGO_URL,

  accessTokenSecret: rawEnv.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: rawEnv.REFRESH_TOKEN_SECRET,
  accessTokenTtl: rawEnv.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: rawEnv.REFRESH_TOKEN_TTL_DAYS,

  cookieSecure: rawEnv.COOKIE_SECURE,

  webAppUrl: rawEnv.WEB_APP_URL,
  allowedOrigins: rawEnv.ALLOWED_ORIGINS,
  sentryDsn: rawEnv.SENTRY_DSN,

  resendApiKey: rawEnv.RESEND_API_KEY,
  emailFrom: rawEnv.EMAIL_FROM,

  revalidateSecret: rawEnv.REVALIDATE_SECRET,
  cronSecret: rawEnv.CRON_SECRET,
  cloudinary: {
    cloudName: rawEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: rawEnv.CLOUDINARY_API_KEY,
    apiSecret: rawEnv.CLOUDINARY_API_SECRET,
    folder: rawEnv.CLOUDINARY_FOLDER,
  },

  upstashUrl: rawEnv.UPSTASH_REDIS_REST_URL,
  upstashToken: rawEnv.UPSTASH_REDIS_REST_TOKEN,
  rateLimitDisabled: rawEnv.RATE_LIMIT_DISABLED,

  initialAdminEmail: rawEnv.INITIAL_ADMIN_EMAIL,
  initialAdminPassword: rawEnv.INITIAL_ADMIN_PASSWORD,

  logLevel: rawEnv.LOG_LEVEL,
} as const;

export type Env = typeof env;
