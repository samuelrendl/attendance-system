import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const employee = pgTable("employee", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const timeEntry = pgTable("time_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employee.id),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
});

/** A device the Admin has activated as a Kiosk. Only a hash of its device token is stored. */
export const kiosk = pgTable("kiosk", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
