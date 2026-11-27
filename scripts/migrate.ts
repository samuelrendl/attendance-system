// Applies the Drizzle migrations in ./drizzle to DATABASE_URL, then exits.
// Production's migrate service runs this (bundled to scripts/migrate.mjs)
// instead of drizzle-kit, which isn't in the image. It uses the same
// migrations table as `pnpm db:migrate`, so either can run against a database.
// A failing migration is rolled back and exits non-zero.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing environment variable DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
