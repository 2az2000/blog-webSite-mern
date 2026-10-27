import { defineConfig } from "vitest/config";

/**
 * API integration tests — exercise the real HTTP surface
 * against an in-memory MongoDB (mongodb-memory-server).
 * `npm run test:api`
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/api/setup.ts"],
    include: ["tests/api/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
