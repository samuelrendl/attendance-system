import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// `next start` loads .env itself; the tests need it too, for the Admin's
// seeded email and password.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Runs the production build; run `pnpm build` first. Needs the environment
  // variables from .env.example, pointing at a migrated database.
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env.CI,
  },
});
