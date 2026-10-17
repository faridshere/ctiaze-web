import { defineConfig, devices } from "@playwright/test";

// Browser checks against a PRODUCTION build (`npm run build` first): the
// edition script, ISR 404 shells and animation timing all differ under
// `next dev`. PW_BASE_URL points the specs at a server you already run;
// otherwise `next start` is launched on :3100. Data-backed pages need
// MONGO_URI_READONLY like any local run.
const PORT = 3100;
const BASE = process.env.PW_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: BASE, ...devices["Desktop Chrome"] },
  webServer: process.env.PW_BASE_URL
    ? undefined
    : { command: `npx next start -p ${PORT}`, url: `${BASE}/robots.txt`, reuseExistingServer: true, timeout: 60_000 },
});
