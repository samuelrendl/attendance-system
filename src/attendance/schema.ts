import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const employee = pgTable("employee", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** The 4-digit PIN as a slow password hash (see pin.ts). Never the PIN itself. */
  pinHash: text("pin_hash").notNull(),
  /** When the Employee was Deactivated; null while active. */
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  /** Consecutive wrong PINs at the Kiosk (lockout, ticket 06). */
  wrongPinCount: integer("wrong_pin_count").notNull().default(0),
  /** The end of a PIN lockout (ticket 06); null when not locked out. */
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

export const timeEntry = pgTable("time_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employee.id),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
});
