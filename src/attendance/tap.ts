import { and, asc, desc, eq, gte, isNull, lt } from "drizzle-orm";
import type { AttendanceDatabase } from "./index";
import { isUuid } from "./ids";
import { verifyPin } from "./pin";
import { employee, timeEntry } from "./schema";
import {
  addDays,
  minutesWorked,
  onSiteSince,
  startOfWorkplaceDay,
  workplaceDay,
} from "./time-rules";

export type TapInput = {
  employeeId: string;
  pin: string;
  /** The Kiosk the tap was made at (resolved from its device token). */
  kioskId: string;
  now: Date;
};

/** Who tapped, as the Kiosk shows them. */
export type TappedEmployee = { id: string; name: string };

/**
 * What a tap did. Exactly one of:
 *
 * - `clocked-in`: a new Time entry was started.
 * - `clocked-out`: the Employee's On site Time entry was closed.
 * - `wrong-pin`: nothing was recorded.
 * - `unknown-employee`: no active Employee has this id (it doesn't exist, or
 *   they are Deactivated); nothing was recorded and the PIN wasn't checked.
 *
 * Both successes carry `minutesToday`: the minutes worked at `now` on the
 * workplace day the Time entry belongs to (its Clock in day), across all of
 * that day's Time entries. For an overnight Clock out, that is the day it
 * started.
 *
 * Ticket 06 adds `{ outcome: "locked-out"; until: Date }`, and ticket 07 an
 * undo handle on both successes.
 */
export type TapResult =
  | {
      outcome: "clocked-in" | "clocked-out";
      employee: TappedEmployee;
      /** The Time entry the tap started or closed. */
      timeEntryId: string;
      /** The Clock in or Clock out time: the tap's `now`. */
      at: Date;
      minutesToday: number;
    }
  | { outcome: "wrong-pin"; employee: TappedEmployee }
  | { outcome: "unknown-employee" };

export type TapOutcome = TapResult["outcome"];

/** An active Employee as the Kiosk lists them. */
export type KioskEmployee = {
  id: string;
  name: string;
  /** Whether they are On site at `now` (an open Time entry that isn't a Missed clock-out). */
  onSite: boolean;
};

/** The Kiosk's commands and queries of the Attendance module. */
export function kioskTaps(db: AttendanceDatabase, timeZone: string) {
  return {
    /**
     * An Employee's tap at a Kiosk: their PIN is checked, then it toggles.
     * If they are On site, it clocks them out of that open Time entry.
     * Otherwise it clocks them in with a new Time entry, even if they have a
     * Missed clock-out, which is left for the Admin to correct.
     */
    async tap({ employeeId, pin, now }: TapInput): Promise<TapResult> {
      if (!isUuid(employeeId)) {
        return { outcome: "unknown-employee" };
      }
      // One transaction per tap, holding the Employee's row, so two taps for
      // the same Employee (say, at two Kiosks) toggle one after the other.
      return db.transaction(async (tx) => {
        const [tapper] = await tx
          .select({ id: employee.id, name: employee.name, pinHash: employee.pinHash })
          .from(employee)
          .where(and(eq(employee.id, employeeId), isNull(employee.deactivatedAt)))
          .for("update");
        if (!tapper) {
          return { outcome: "unknown-employee" } as const;
        }
        const who = { id: tapper.id, name: tapper.name };
        if (!(await verifyPin(pin, tapper.pinHash))) {
          return { outcome: "wrong-pin", employee: who } as const;
        }

        const [onSiteEntry] = await tx
          .select({ id: timeEntry.id, clockIn: timeEntry.clockIn })
          .from(timeEntry)
          .where(
            and(
              eq(timeEntry.employeeId, employeeId),
              isNull(timeEntry.clockOut),
              gte(timeEntry.clockIn, onSiteSince(now)),
            ),
          )
          .orderBy(desc(timeEntry.clockIn))
          .limit(1);

        let timeEntryId: string;
        if (onSiteEntry) {
          await tx
            .update(timeEntry)
            .set({ clockOut: now })
            .where(eq(timeEntry.id, onSiteEntry.id));
          timeEntryId = onSiteEntry.id;
        } else {
          const [started] = await tx
            .insert(timeEntry)
            .values({ employeeId, clockIn: now })
            .returning({ id: timeEntry.id });
          timeEntryId = started.id;
        }

        const day = workplaceDay(onSiteEntry?.clockIn ?? now, timeZone);
        const dayEntries = await tx
          .select({ clockIn: timeEntry.clockIn, clockOut: timeEntry.clockOut })
          .from(timeEntry)
          .where(
            and(
              eq(timeEntry.employeeId, employeeId),
              gte(timeEntry.clockIn, startOfWorkplaceDay(day, timeZone)),
              lt(timeEntry.clockIn, startOfWorkplaceDay(addDays(day, 1), timeZone)),
            ),
          );

        return {
          outcome: onSiteEntry ? "clocked-out" : "clocked-in",
          employee: who,
          timeEntryId,
          at: now,
          minutesToday: minutesWorked(dayEntries, now),
        } as const;
      });
    },

    /** The Employees who can tap at the Kiosk: every active Employee, by name. */
    async listKioskEmployees(now: Date): Promise<KioskEmployee[]> {
      const active = await db
        .select({ id: employee.id, name: employee.name })
        .from(employee)
        .where(isNull(employee.deactivatedAt))
        .orderBy(asc(employee.name), asc(employee.id));
      const onSite = new Set(
        (
          await db
            .selectDistinct({ employeeId: timeEntry.employeeId })
            .from(timeEntry)
            .where(and(isNull(timeEntry.clockOut), gte(timeEntry.clockIn, onSiteSince(now))))
        ).map((row) => row.employeeId),
      );
      return active.map((e) => ({ ...e, onSite: onSite.has(e.id) }));
    },
  };
}
