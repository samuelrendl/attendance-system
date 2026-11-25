import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Each test boots its own in-process Postgres (PGlite), which takes a moment.
    testTimeout: 30_000,
  },
});
