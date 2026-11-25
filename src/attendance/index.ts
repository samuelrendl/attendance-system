import { and, asc, eq, gte, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

const { employee, timeEntry } = schema;

export { schema };

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

/** An open Time entry older than this is a Missed clock-out, not On site. */
const MISSED_CLOCK_OUT_AFTER_MS = 16 * 60 * 60 * 1000;

/**
 * The Attendance module: the one home for every domain rule.
 * Every operation takes the current time (`now`) explicitly.
 */
export function createAttendance({ db, timeZone }: AttendanceOptions) {
  assertKnownTimeZone(timeZone);

  return {
    /** Every Employee currently On site, earliest Clock in first. */
    async onSiteNow(now: Date): Promise<OnSiteEmployee[]> {
      const missedClockOutBefore = new Date(
        now.getTime() - MISSED_CLOCK_OUT_AFTER_MS,
      );
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
            gte(timeEntry.clockIn, missedClockOutBefore),
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
