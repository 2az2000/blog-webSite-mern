import type { NextConfig } from "next";

/** Express API (../server). Browser calls go to /api/* and are proxied, so cookies stay same-origin. */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  images: {
    // Required since Next 16: the only quality the optimizer will produce.
    qualities: [75],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
