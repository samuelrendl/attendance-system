# 05: Clock in and out at the Kiosk

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** The core loop. On an activated Kiosk, an Employee:

1. picks their name from a plain list of active Employees (the UI SDK picker comes in ticket 08)
2. enters their PIN
3. is clocked in or out by a toggle

A confirmation clearly says **Clocked in** or **Clocked out**, the time, and the hours worked today in the workplace time zone. Then the Kiosk returns to the name list automatically. In the admin area, On site now lists every Employee currently On site with their Clock in time.

Rules, all in the Attendance module:

- A Time entry without a Clock out is open. An open Time entry whose Clock in is more than 16 hours before `now` is a **Missed clock-out**. This is derived at query time and never stored.
- If the Employee is On site (has an open Time entry that isn't a Missed clock-out), the tap clocks them out of it. Otherwise it clocks them in with a new Time entry, even if they have a Missed clock-out.
- A Time entry belongs to the day of its Clock in, in the workplace time zone. Several Time entries per day are allowed.
- A wrong PIN is rejected with a plain message, and Deactivated Employees aren't listed and can't tap.

**Blocked by:** 03 (Manage Employees), 04 (Activate and revoke Kiosks)

**Status:** resolved

- [x] On an activated Kiosk, tapping a name and entering the right PIN clocks an Employee in who isn't On site, and out who is
- [x] The confirmation shows in or out, the time, and the hours worked today, then returns to the name list
- [x] A wrong PIN shows a plain error and records nothing
- [x] The Admin's On site now list shows On site Employees with their Clock in time, and excludes Missed clock-outs
- [x] Attendance-module tests cover: the toggle; the 16-hour boundary (just under is On site, just over is a Missed clock-out); a tap after a Missed clock-out clocks in; an overnight Time entry (22:00 → 06:00) is closed by the morning tap and belongs to the earlier day; lunch out and back in gives two Time entries and the right hours today; a Deactivated Employee can't tap
- [x] Playwright E2E: activate a Kiosk → tap a name → enter the PIN → see the Clocked in confirmation

## Comments

**2026-11-25 (agent, from ticket 01):** `onSiteNow` already applies the 16-hour rule (open entries whose Clock in is at most 16 hours before `now`), but no test covers it yet, because there was no way to create Employees or Time entries through the interface. This ticket's boundary and "excludes Missed clock-outs" tests are what verify it. It doesn't yet exclude voided Time entries or Deactivated Employees.

**2026-11-27 (agent):** Implemented. Lint, typecheck, Vitest (22 tap tests in `src/attendance/tap.test.ts`, 13 time-rule tests in `src/attendance/time-rules.test.ts`, 2 formatting tests) and the build pass. All 12 Playwright tests pass against the production build on a PGlite server, twice in a row on the same database. That includes the new `e2e/kiosk-tap.spec.ts`, which covers clocking in, On site now, clocking out and a wrong PIN. Nothing left unverified.

What later tickets need to know:

- **`tap({ employeeId, pin, kioskId, now })`** (`src/attendance/tap.ts`) returns a `TapResult` union on `outcome`:
  - `clocked-in` and `clocked-out` carry `employee: { id, name }`, `timeEntryId`, `at` (= `now`) and `minutesToday`.
  - `wrong-pin` carries `employee`.
  - `unknown-employee` means no active Employee has that id: it doesn't exist, isn't a UUID, or is Deactivated. The PIN isn't checked.
  - `minutesToday` is the minutes worked on the workplace day the Time entry belongs to, so an overnight Clock out reports the day it started.
  - **Ticket 06:** add `{ outcome: "locked-out"; until: Date }`. Each tap runs in one transaction that locks the Employee's row (`SELECT … FOR UPDATE`), so update `wrong_pin_count` and `locked_until` inside it. Check the lockout before `verifyPin`.
  - **Ticket 07:** add the undo handle to both successes. `kioskId` is accepted but not stored yet, and nothing records which Kiosk made a tap.
  - The Kiosk action maps outcomes in `src/app/kiosk/actions.ts` (`KioskTapView`) and messages in `pin-step.tsx`. Both `switch`es are exhaustive, so TypeScript points at them when you add an outcome.
- **Shared time rules** live in `src/attendance/time-rules.ts` and are re-exported from `@/attendance`. They're pure and take `now` and the time zone.
  - `onSiteSince(now)` is the Missed clock-out cutoff for SQL: `clockOut is null and clockIn >= onSiteSince(now)` is On site. Exactly 16h is still On site.
  - `entryState(entry, now)` returns `completed`, `on-site` or `missed-clock-out`.
  - `entryMinutes` and `minutesWorked`: each entry counts its whole minutes, truncated, with On site counting to `now` and a Missed clock-out counting 0. So any day or week total is the sum of its entries' displayed minutes, which keeps the Register (09) and Timesheet (10) in agreement.
  - `workplaceDay(instant, tz)` returns a `YYYY-MM-DD` string. `entryDay` gives the day of the Clock in, and `minutesWorkedOn(day, entries, tz, now)` the minutes for one day.
  - `startOfWorkplaceDay(day, tz)` is DST-safe (23- and 25-hour days are tested). `addDays(day, n)` is plain calendar arithmetic. Query a day as `clockIn >= start(day) and clockIn < start(addDays(day, 1))`. Weeks (Monday to Sunday) are left to ticket 09.
  - Callers must leave voided entries out before calling these. The schema has no `voided_at` yet: when ticket 12 adds it, filter it in `tap`'s two queries, `listKioskEmployees` and `onSiteNow`.
- **`listKioskEmployees(now)`** returns the active Employees by name, each `{ id, name, onSite }`. `onSite` is there for ticket 08's status dot, and nothing shows it yet.
- **The Kiosk UI** (`src/app/kiosk/`). `kiosk-tap.tsx` is a small state machine: name step, then PIN step, then confirmation.
  - The name step is `name-list.tsx` (`NameList({ employees, onPick })`, where `onPick` receives `{ id, name }`). Ticket 08 swaps in the UI SDK picker with the same props.
  - `PinStep` and `Confirmation` only know the picked `{ id, name }`.
  - The confirmation (`role="status"`) shows "Clocked in" or "Clocked out", "<name> at HH:MM" and "Worked today: 7h 45m". It returns to the names after 5 s (`SHOW_FOR_MS` in `confirmation.tsx`) or on Done. Ticket 07 will want 10 s and the Undo button there.
  - The page polls with `router.refresh()` every 60 s, and a successful tap calls `refresh()`.
- **Formatting** goes in `src/lib/format.ts`: `formatDuration(465)` gives "7h 45m" (minutes always two digits) and `formatTime(instant, tz)` gives "09:00". The Register and Timesheet should reuse them. The action formats times on the server, so the browser's time zone is never used.
- **E2E tests share one database**, so don't assert that nobody is On site. The smoke test now accepts the On site now list too (`<ul aria-label="On site now">`), and the Kiosk tests clock their Employees out again at the end.
- `isUuid` moved to `src/attendance/ids.ts`.
