import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { onTestFinished } from "vitest";
import { createAttendance, schema } from "./index";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/**
 * An Attendance module backed by a fresh in-process Postgres (PGlite)
 * with the project's migrations applied. Call it inside a test: the
 * database is closed when that test finishes.
 */
export async function createTestAttendance({
  timeZone = "Europe/London",
}: { timeZone?: string } = {}) {
  const client = new PGlite();
  onTestFinished(() => client.close());

  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });

  return createAttendance({ db, timeZone });
}
