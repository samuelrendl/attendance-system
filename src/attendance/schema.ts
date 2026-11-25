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
