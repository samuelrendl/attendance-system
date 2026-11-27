import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
// Set E2E_BASE_URL to test an app that's already running (CI points it at
// the Compose stack). Otherwise Playwright starts the production build.
const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Runs the production build; run `pnpm build` first. Needs DATABASE_URL and
  // WORKPLACE_TIME_ZONE pointing at a migrated database.
  webServer: externalBaseURL
    ? undefined
    : {
        command: `pnpm start --port ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
      },
});
