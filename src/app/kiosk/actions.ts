"use server";

import { refresh } from "next/cache";
import { getServer } from "@/server/attendance";
import { currentKiosk } from "@/server/kiosk-device";
import { formatDuration, formatTime } from "@/lib/format";

/**
 * What the Kiosk shows after a tap, ready to display: the Attendance
 * module's `TapResult` with times formatted in the workplace time zone, plus
 * `not-a-kiosk` when this device stopped being a Kiosk.
 */
export type KioskTapView =
  | {
      outcome: "clocked-in" | "clocked-out";
      name: string;
      /** The Clock in or Clock out time, e.g. "09:00". */
      time: string;
      /** Hours worked today, e.g. "7h 45m". */
      hoursToday: string;
    }
  | { outcome: "wrong-pin" }
  | { outcome: "unknown-employee" }
  | { outcome: "not-a-kiosk" };

/** An Employee's tap at this Kiosk: their PIN, then a Clock in or Clock out. */
export async function tapAtKiosk(employeeId: string, pin: string): Promise<KioskTapView> {
  const kiosk = await currentKiosk();
  if (!kiosk) {
    return { outcome: "not-a-kiosk" };
  }
  const { attendance, workplaceTimeZone } = getServer();
  const result = await attendance.tap({
    employeeId,
    pin,
    kioskId: kiosk.id,
    now: new Date(),
  });

  switch (result.outcome) {
    case "clocked-in":
    case "clocked-out":
      // Re-render the Kiosk page in this response, so who's On site is current.
      refresh();
      return {
        outcome: result.outcome,
        name: result.employee.name,
        time: formatTime(result.at, workplaceTimeZone),
        hoursToday: formatDuration(result.minutesToday),
      };
    case "wrong-pin":
    case "unknown-employee":
      return { outcome: result.outcome };
  }
}
