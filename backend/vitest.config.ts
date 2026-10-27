import { defineConfig } from "vitest/config";

/** Unit tests — pure logic, no database. `npm test` */
export default defineConfig({
  test: {
    environment: "node",
    env: { LOG_LEVEL: "silent" },
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: true,
  },
});
