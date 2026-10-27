import { defineConfig } from "@playwright/test";

/*
 * Browser tests of the real stack: the site, the API and a MongoDB, with the
 * content and the e2e accounts seeded (see e2e/README.md). They sign in as real
 * people and do real things; none of them mocks anything.
 *
 *   npm run e2e                 # against http://localhost:3000
 *   E2E_BASE_URL=https://… npm run e2e
 *
 * Locally they drive your installed Chrome; in CI (CI=true) the Chromium that
 * `npx playwright install chromium` fetches.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/* The cookie notice is answered up front, so it never sits over a button a test clicks (its own test clears this). */
const answeredNotice = {
  origins: [
    {
      origin: new URL(baseURL).origin,
      localStorage: [
        { name: "nova:consent", value: JSON.stringify({ schema: 1, preferences: false, at: "2026-01-01T00:00:00.000Z", policy: "2026-10-26" }) },
      ],
    },
  ],
  cookies: [],
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  // generous: against `next dev` the first visit to a page waits for it to compile
  expect: { timeout: 30_000 },
  // one at a time: the tests share a database and the order of comments and issues matters
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    storageState: answeredNotice,
    trace: "retain-on-failure",
    ...(process.env.CI ? {} : { channel: "chrome" }),
  },
});
