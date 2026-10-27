# Browser tests

They drive the real site, API and database. Nothing is mocked.

```bash
# 1. MongoDB, then the API with the console mailer and no rate limits, with content and the e2e accounts
docker start nova-mongo
cd backend
npm run seed:content && npm run seed:e2e
RESEND_API_KEY="" RATE_LIMIT_DISABLED=1 REVALIDATE_SECRET=dev-revalidate-secret npm run dev

# 2. the site (a production build is closer to what readers get; `npm run dev` also works)
cd web
npm run dev          # or: npm run build && npm start

# 3. the tests
npm run e2e          # add `-- --headed` to watch, `-- --ui` for the inspector
```

`RESEND_API_KEY=""` matters: the sign-up tests use `@example.com` addresses, which a real mail provider refuses.

Locally the tests drive your installed Chrome. In CI (`CI=true`) they use Playwright's Chromium (`npx playwright install chromium`).
