import { and, asc, eq, gte, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { employeeManagement } from "./employees";
import { kioskManagement } from "./kiosks";
import { kioskTaps } from "./tap";
import { onSiteSince } from "./time-rules";
import * as schema from "./schema";

const { employee, timeEntry } = schema;

export { schema };
export type { Employee, EmployeeProblem, EmployeeResult } from "./employees";
export type { ActivateKioskResult, Kiosk, KioskListing } from "./kiosks";
export type { KioskEmployee, TapInput, TapOutcome, TapResult, TappedEmployee } from "./tap";
export * from "./time-rules";

/** Any Drizzle Postgres database with the Attendance schema: node-postgres in the app, PGlite in tests. */
export type AttendanceDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

export type AttendanceOptions = {
  db: AttendanceDatabase;
  /** The workplace time zone (IANA name, e.g. "Europe/London"), used for all day and week boundaries. */
  timeZone: string;
};

export type OnSiteEmployee = {
  employeeId: string;
  name: string;
  clockIn: Date;
};

/**
 * The Attendance module: the one home for every domain rule.
 * Every operation takes the current time (`now`) explicitly.
 */
export function createAttendance({ db, timeZone }: AttendanceOptions) {
  assertKnownTimeZone(timeZone);

  return {
    ...employeeManagement(db),
    ...kioskManagement(db),
    ...kioskTaps(db, timeZone),

    /** Every Employee currently On site, earliest Clock in first. */
    async onSiteNow(now: Date): Promise<OnSiteEmployee[]> {
      return db
        .select({
          employeeId: employee.id,
          name: employee.name,
          clockIn: timeEntry.clockIn,
        })
        .from(timeEntry)
        .innerJoin(employee, eq(timeEntry.employeeId, employee.id))
        .where(
          and(
            isNull(timeEntry.clockOut),
            gte(timeEntry.clockIn, onSiteSince(now)),
          ),
        )
        .orderBy(asc(timeEntry.clockIn));
    },
  };
}

export type Attendance = ReturnType<typeof createAttendance>;

function assertKnownTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    throw new Error(`Unknown workplace time zone "${timeZone}"`);
  }
}
