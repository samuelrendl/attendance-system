/**
 * The time rules every part of the Attendance module shares: when an open
 * Time entry becomes a Missed clock-out, which workplace day a Time entry
 * belongs to, and how many minutes were worked. The Kiosk tap, On site now,
 * the Register and the Timesheet all use these, so they always agree.
 *
 * All of them are pure: they take `now` and the workplace time zone as
 * arguments and never read the clock.
 */

/** The parts of a Time entry the time rules look at. Voided entries must be left out by the caller. */
export type TimedEntry = { clockIn: Date; clockOut: Date | null };

/**
 * A Time entry is `completed` once it has a Clock out. An open one is
 * `on-site` until it has been open more than 16 hours, then it is a
 * `missed-clock-out`.
 */
export type EntryState = "completed" | "on-site" | "missed-clock-out";

const MISSED_CLOCK_OUT_AFTER_MS = 16 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * The earliest Clock in an open Time entry can have and still be On site at
 * `now`. An open entry that clocked in before this is a Missed clock-out.
 * For database queries: `clockOut is null and clockIn >= onSiteSince(now)`.
 */
export function onSiteSince(now: Date): Date {
  return new Date(now.getTime() - MISSED_CLOCK_OUT_AFTER_MS);
}

/** Whether a Time entry is completed, On site or a Missed clock-out at `now`. */
export function entryState(entry: TimedEntry, now: Date): EntryState {
  if (entry.clockOut) {
    return "completed";
  }
  return entry.clockIn < onSiteSince(now) ? "missed-clock-out" : "on-site";
}

/**
 * The whole minutes a Time entry counts for at `now`: its duration once
 * completed, the time since its Clock in while On site, and nothing for a
 * Missed clock-out. Each entry is cut down to whole minutes (no rounding up),
 * so a day's or a week's total is always the sum of its entries' minutes.
 */
export function entryMinutes(entry: TimedEntry, now: Date): number {
  switch (entryState(entry, now)) {
    case "completed":
      return wholeMinutes(entry.clockIn, entry.clockOut!);
    case "on-site":
      return wholeMinutes(entry.clockIn, now);
    case "missed-clock-out":
      return 0;
  }
}

/** The minutes worked across these Time entries at `now` (see `entryMinutes`). Gaps between them don't count. */
export function minutesWorked(entries: readonly TimedEntry[], now: Date): number {
  return entries.reduce((total, entry) => total + entryMinutes(entry, now), 0);
}

/**
 * A calendar day in the workplace time zone, as `YYYY-MM-DD`
 * (e.g. "2026-11-23"). Strings in this form sort and compare by date.
 */
export type WorkplaceDay = string;

/** The workplace day an instant falls on. A Time entry belongs to the workplace day of its Clock in. */
export function workplaceDay(instant: Date, timeZone: string): WorkplaceDay {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The workplace day a Time entry belongs to: the day of its Clock in, even if it ends after midnight. */
export function entryDay(entry: TimedEntry, timeZone: string): WorkplaceDay {
  return workplaceDay(entry.clockIn, timeZone);
}

/** The minutes worked at `now` in the Time entries that belong to `day`. */
export function minutesWorkedOn(
  day: WorkplaceDay,
  entries: readonly TimedEntry[],
  timeZone: string,
  now: Date,
): number {
  return minutesWorked(
    entries.filter((entry) => entryDay(entry, timeZone) === day),
    now,
  );
}

/** The day `days` calendar days after `day` (or before, if negative). */
export function addDays(day: WorkplaceDay, days: number): WorkplaceDay {
  const [year, month, date] = parseDay(day);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/**
 * The first instant of a workplace day: midnight in the workplace time zone,
 * whatever its UTC offset that day. A day runs from its start to the next
 * day's start, so it can be 23 or 25 hours long around daylight-saving
 * changes. For database queries: `clockIn >= start(day) and clockIn < start(addDays(day, 1))`.
 */
export function startOfWorkplaceDay(day: WorkplaceDay, timeZone: string): Date {
  const [year, month, date] = parseDay(day);
  const midnightAsUtc = Date.UTC(year, month - 1, date);
  // Guess with the offset at UTC midnight, then correct once with the offset
  // at the guess, which is right unless the offset changes in between.
  let start = midnightAsUtc - offsetAt(midnightAsUtc, timeZone);
  start = midnightAsUtc - offsetAt(start, timeZone);
  // If midnight doesn't exist that day (a clock change at 00:00), the day
  // starts at the first instant that falls on it.
  while (workplaceDay(new Date(start), timeZone) < day) {
    start += MINUTE_MS;
  }
  return new Date(start);
}

function wholeMinutes(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MINUTE_MS));
}

/** How far the time zone's wall clock is ahead of UTC at this instant, in milliseconds. */
function offsetAt(epochMs: number, timeZone: string): number {
  const { year, month, day, hour, minute, second } = zonedParts(new Date(epochMs), timeZone);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return wallClockAsUtc - Math.floor(epochMs / 1000) * 1000;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function zonedParts(instant: Date, timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function parseDay(day: WorkplaceDay): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    throw new Error(`Not a workplace day (YYYY-MM-DD): "${day}"`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
