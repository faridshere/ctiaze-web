import { defineConfig, devices } from "@playwright/test";

// Browser checks for the front page and the shared chrome (2026-10-17).
// Run against a production server: `npm run build && npx playwright test`.
// The server is reused when one already listens on BASE_URL. Set
// PW_CHROMIUM to a local Chromium binary to skip Playwright's own download.
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run start", url: BASE_URL, reuseExistingServer: true, timeout: 120_000 },
});
