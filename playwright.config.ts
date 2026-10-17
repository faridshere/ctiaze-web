import { defineConfig, devices } from "@playwright/test";

// Browser checks against a PRODUCTION build (`npm run build` first): the
// edition script, ISR 404 shells and animation timing all differ under
// `next dev`. PW_BASE_URL (or BASE_URL) points the specs at a server you
// already run; otherwise `next start` is launched on :3100. Data-backed
// pages need MONGO_URI_READONLY like any local run. Set PW_CHROMIUM to a
// local Chromium binary to skip Playwright's own download.
const PORT = 3100;
const BASE = process.env.PW_BASE_URL || process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: BASE,
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer:
    process.env.PW_BASE_URL || process.env.BASE_URL
      ? undefined
      : { command: `npx next start -p ${PORT}`, url: `${BASE}/robots.txt`, reuseExistingServer: true, timeout: 120_000 },
});
