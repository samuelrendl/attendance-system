import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env itself; drizzle-kit doesn't, so load it here when present.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/attendance/schema.ts", "./src/auth/schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
