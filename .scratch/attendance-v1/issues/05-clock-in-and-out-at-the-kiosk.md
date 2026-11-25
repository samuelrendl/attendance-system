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

**Status:** ready-for-agent

- [ ] On an activated Kiosk, tapping a name and entering the right PIN clocks an Employee in who isn't On site, and out who is
- [ ] The confirmation shows in or out, the time, and the hours worked today, then returns to the name list
- [ ] A wrong PIN shows a plain error and records nothing
- [ ] The Admin's On site now list shows On site Employees with their Clock in time, and excludes Missed clock-outs
- [ ] Attendance-module tests cover: the toggle; the 16-hour boundary (just under is On site, just over is a Missed clock-out); a tap after a Missed clock-out clocks in; an overnight Time entry (22:00 → 06:00) is closed by the morning tap and belongs to the earlier day; lunch out and back in gives two Time entries and the right hours today; a Deactivated Employee can't tap
- [ ] Playwright E2E: activate a Kiosk → tap a name → enter the PIN → see the Clocked in confirmation

## Comments

**2026-11-25 (agent, from ticket 01):** `onSiteNow` already applies the 16-hour rule (open entries whose Clock in is at most 16 hours before `now`), but no test covers it yet, because there was no way to create Employees or Time entries through the interface. This ticket's boundary and "excludes Missed clock-outs" tests are what verify it. It doesn't yet exclude voided Time entries or Deactivated Employees.
