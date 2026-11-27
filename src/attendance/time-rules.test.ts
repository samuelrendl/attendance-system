import { describe, expect, test } from "vitest";
import {
  addDays,
  entryDay,
  entryMinutes,
  entryState,
  minutesWorked,
  minutesWorkedOn,
  startOfWorkplaceDay,
  workplaceDay,
} from "./time-rules";

const utc = (iso: string) => new Date(`${iso}Z`);

describe("Missed clock-out (the 16-hour rule)", () => {
  const open = { clockIn: utc("2026-11-23T08:00:00"), clockOut: null };

  test("an open Time entry is On site up to exactly 16 hours after its Clock in", () => {
    expect(entryState(open, utc("2026-11-23T23:59:59"))).toBe("on-site");
    expect(entryState(open, utc("2026-11-24T00:00:00"))).toBe("on-site");
  });

  test("an open Time entry more than 16 hours old is a Missed clock-out", () => {
    expect(entryState(open, utc("2026-11-24T00:00:01"))).toBe("missed-clock-out");
  });

  test("a Time entry with a Clock out is completed, however long it was", () => {
    const long = { clockIn: utc("2026-11-23T08:00:00"), clockOut: utc("2026-11-24T08:00:00") };
    expect(entryState(long, utc("2026-11-25T00:00:00"))).toBe("completed");
  });
});

describe("Minutes worked", () => {
  const now = utc("2026-11-23T15:10:30");

  test("a completed Time entry counts its whole minutes", () => {
    expect(
      entryMinutes({ clockIn: utc("2026-11-23T09:00:10"), clockOut: utc("2026-11-23T09:45:09") }, now),
    ).toBe(44);
  });

  test("an On site Time entry counts up to now", () => {
    expect(entryMinutes({ clockIn: utc("2026-11-23T14:00:00"), clockOut: null }, now)).toBe(70);
  });

  test("a Missed clock-out counts nothing", () => {
    expect(entryMinutes({ clockIn: utc("2026-11-22T14:00:00"), clockOut: null }, now)).toBe(0);
  });

  test("gaps between Time entries don't count", () => {
    expect(
      minutesWorked(
        [
          { clockIn: utc("2026-11-23T09:00:00"), clockOut: utc("2026-11-23T12:30:00") },
          { clockIn: utc("2026-11-23T13:15:00"), clockOut: utc("2026-11-23T17:30:00") },
        ],
        now,
      ),
    ).toBe(7 * 60 + 45);
  });
});

describe("Workplace day", () => {
  test("is the calendar day in the workplace time zone", () => {
    // 23:30 UTC on the 23rd is already the 24th in Berlin (UTC+1 in November).
    expect(workplaceDay(utc("2026-11-23T23:30:00"), "Europe/Berlin")).toBe("2026-11-24");
    expect(workplaceDay(utc("2026-11-23T23:30:00"), "Europe/London")).toBe("2026-11-23");
    expect(workplaceDay(utc("2026-11-24T04:30:00"), "America/New_York")).toBe("2026-11-23");
  });

  test("a Time entry belongs to the day of its Clock in, even when it ends after midnight", () => {
    const overnight = { clockIn: utc("2026-11-23T22:00:00"), clockOut: utc("2026-11-24T06:00:00") };

    expect(entryDay(overnight, "Europe/London")).toBe("2026-11-23");
    expect(minutesWorkedOn("2026-11-23", [overnight], "Europe/London", utc("2026-11-24T12:00:00"))).toBe(480);
    expect(minutesWorkedOn("2026-11-24", [overnight], "Europe/London", utc("2026-11-24T12:00:00"))).toBe(0);
  });

  test("starts at midnight in the workplace time zone", () => {
    expect(startOfWorkplaceDay("2026-11-23", "Europe/London")).toEqual(utc("2026-11-23T00:00:00"));
    expect(startOfWorkplaceDay("2026-07-01", "Europe/London")).toEqual(utc("2026-06-30T23:00:00"));
    expect(startOfWorkplaceDay("2026-11-24", "Pacific/Auckland")).toEqual(utc("2026-11-23T11:00:00"));
  });

  test("is 23 or 25 hours long on the days the clocks change", () => {
    const hours = (day: string, timeZone: string) =>
      (startOfWorkplaceDay(addDays(day, 1), timeZone).getTime() -
        startOfWorkplaceDay(day, timeZone).getTime()) /
      3_600_000;

    // In 2026 the UK clocks go forward on 29 March and back on 25 October.
    expect(hours("2026-03-29", "Europe/London")).toBe(23);
    expect(hours("2026-10-25", "Europe/London")).toBe(25);
    expect(hours("2026-11-23", "Europe/London")).toBe(24);
  });

  test("starts at the first instant of the day where the clocks skip midnight", () => {
    // Santiago goes from 23:59:59 (UTC-4) on 5 September 2026 straight to 01:00 (UTC-3).
    expect(startOfWorkplaceDay("2026-09-06", "America/Santiago")).toEqual(utc("2026-09-06T04:00:00"));
  });

  test("days count on across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
