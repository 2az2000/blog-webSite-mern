import type { NextConfig } from "next";

/** Express API (../backend). Browser calls go to /api/* and are proxied, so cookies stay same-origin. */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:5000";

const isProd = process.env.NODE_ENV === "production";

/** `SITE_ENV=staging`: a test copy that search engines must not list. */
const isStaging = process.env.SITE_ENV === "staging";

/**
 * Content-Security-Policy. Scripts and styles may be inline (Next writes its hydration
 * data inline; a nonce would make every page dynamic and lose caching), but nothing may
 * load from anywhere else: no third-party scripts, no framing, no plugins.
 * Cloudinary is allowed for the editor's direct image upload.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self' https://api.cloudinary.com${isProd ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  ...(isStaging ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Required since Next 16: the only quality the optimizer will produce.
    qualities: [75],
    formats: ["image/avif", "image/webp"],
    // Pictures uploaded through the back office are hosted on Cloudinary, which resizes and re-encodes
    // them itself (AVIF/WebP via f_auto): see SiteImage and src/lib/image-loader.ts. Pictures in /public
    // still go through Next's own optimizer, configured above.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
