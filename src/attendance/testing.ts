import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { onTestFinished } from "vitest";
import { createAttendance, schema, type AttendanceDatabase } from "./index";
import { verifyPin } from "./pin";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/**
 * A fresh in-process Postgres (PGlite) with the project's migrations applied.
 * Call it inside a test: the database is closed when that test finishes.
 */
export async function createTestDatabase() {
  const client = new PGlite();
  onTestFinished(() => client.close());

  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  return db;
}

/** An Attendance module backed by a fresh test database (see `createTestDatabase`). */
export async function createTestAttendance({
  timeZone = "Europe/London",
}: { timeZone?: string } = {}) {
  return createAttendance({ db: await createTestDatabase(), timeZone });
}

/**
 * What is stored for an Employee's PIN. Only for checking that PINs are
 * stored hashed. Whether a PIN matches can be checked through `tap` instead.
 */
export async function storedPin(db: AttendanceDatabase, employeeId: string) {
  const [row] = await db
    .select({ pinHash: schema.employee.pinHash })
    .from(schema.employee)
    .where(eq(schema.employee.id, employeeId));
  if (!row) {
    throw new Error(`No Employee ${employeeId}`);
  }
  return {
    stored: row.pinHash,
    matches: (pin: string) => verifyPin(pin, row.pinHash),
  };
}
