// How times and durations read on screen, shared by the Kiosk and the admin
// area. Formatting only: the Attendance module decides what the numbers are.

/** Minutes worked as hours and minutes, e.g. 465 → "7h 45m". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

/** A 24-hour clock time in the workplace time zone, e.g. "09:00". Never the browser's zone. */
export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}
