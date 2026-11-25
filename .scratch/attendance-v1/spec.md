# Spec: Attendance system v1

Status: ready-for-agent

## Problem Statement

The workplace tracks attendance with a paper sign-in register. Employees write their name and times in a book at the entrance. That makes it hard to answer the two questions the register exists for:

- **Who is on site right now?** For a fire roll-call, someone has to read the book and work out who signed in and hasn't signed out yet.
- **How long did each person work?** Totting up hours for a week means reading handwriting across pages and doing arithmetic by hand.

Mistakes get lost as well. A forgotten sign-out, a missing sign-in, or a scribbled-over time leaves no trace of what was wrong or who fixed it.

This is a hobby and learning project. It's built to work as described for a single workplace of about 10 Employees, and it's deployed to the owner's Raspberry Pi with a push-a-tag-and-it-ships workflow, deliberately not on Vercel (see ADR-0001).

## Solution

A web app with two faces:

- **The Kiosk:** a shared screen at the entrance, on a device the Admin has activated as a Kiosk. An Employee taps their name in a grid, enters their 4-digit PIN, and is clocked in or out: the system knows which. A confirmation shows what happened, with a 10-second Undo for accidental taps. A status dot on each name shows who is On site, like glancing at the paper book.
- **The Admin area:** behind a login. The main screen is the **Register**, a weekly grid with one row per Employee and one column per day, showing first Clock in to last Clock out and the hours actually worked, with problems highlighted. From there the Admin can:
  - open an Employee's Timesheet
  - see who is On site now
  - work through Time entries that need a Correction
  - make Corrections (each with a reason, with history kept)
  - manage Employees and Kiosks

Forgotten Clock outs don't produce absurd 24-hour Time entries. After 16 hours an open Time entry becomes a **Missed clock-out**. It's flagged for the Admin, it drops out of On site, and the Employee's next tap starts a fresh Clock in.

## User Stories

### Kiosk: everyday use

1. As an Employee, I want to see a grid of my colleagues' names on the Kiosk, so that I can find mine quickly without typing.
2. As an Employee, I want to filter the name grid by typing the first letters of my name, so that I can find myself quickly when the list is long.
3. As an Employee, I want to move through the name grid with the keyboard and arrow keys as well as by touch, so that the Kiosk works on a tablet or a laptop.
4. As an Employee, I want to see a status dot next to each name showing who is On site, so that I can tell at a glance whether I'm already clocked in.
5. As an Employee, I want to enter a 4-digit PIN after tapping my name, so that colleagues can't casually clock in on my behalf.
6. As an Employee, I want a single tap-and-PIN action that clocks me in if I'm not On site and out if I am, so that I don't have to choose the right button at the door.
7. As an Employee, I want a confirmation that clearly says whether I was clocked **in** or **out** and at what time, so that I know the right thing happened.
8. As an Employee clocking out, I want the confirmation to show how long I've worked today, so that I get immediate feedback on my day.
9. As an Employee, I want an Undo button on the confirmation for 10 seconds, so that I can reverse an accidental double tap.
10. As an Employee, I want the Kiosk to return to the name grid automatically after the confirmation, so that the next person can use it straight away.
11. As an Employee, I want to clock out for lunch and back in afterwards, so that my breaks aren't counted as work.
12. As an Employee, I want to be told my PIN is wrong without revealing anything else, so that I can retry.
13. As an Employee, I want to be told I'm temporarily locked out after 5 wrong PINs, and for how long, so that I understand why the Kiosk won't accept my PIN.
14. As an Employee, I want my lockout to end by itself after 5 minutes, so that I don't need the Admin to unlock me.
15. As an Employee who forgot to clock out yesterday, I want my first tap today to clock me **in**, so that yesterday's mistake doesn't turn into a bogus 24-hour entry.
16. As an Employee working a night that crosses midnight, I want my Clock out the next morning to close my Time entry, so that overnight work is recorded as one span.

### Kiosk: device trust

17. As an Admin, I want to activate a specific device as a Kiosk while logged in on it, so that only devices I've approved can clock people in.
18. As an Admin, I want to name each Kiosk when I activate it (e.g. "Front door tablet"), so that I can tell them apart later.
19. As an Admin, I want an activated Kiosk to stay activated across restarts and days, so that I don't have to log in on it every morning.
20. As an Admin, I want to be able to activate more than one Kiosk, so that a workplace with two entrances can have one at each.
21. As an Admin, I want to see a list of activated Kiosks, so that I know which devices can clock people in.
22. As an Admin, I want to revoke a Kiosk, so that a lost or stolen tablet stops working immediately.
23. As anyone opening the Kiosk page on a device that isn't an activated Kiosk, I want to see "this device is not a Kiosk" instead of the name grid, so that the app doesn't invite misuse from outside the workplace.

### Admin: access

24. As the Admin, I want to log in with email and password, so that only I can see and change attendance data.
25. As the Admin, I want my account to be created automatically from configuration on the first start, so that there's no public sign-up page anyone could abuse.
26. As the Admin, I want to reset my password from a command on the Pi, so that I can recover access without email.
27. As the Admin, I want to log out, so that a shared computer doesn't stay logged in.

### Admin: the Register

28. As an Admin, I want the Register to be the first screen I see after logging in, so that the week's attendance is in front of me immediately.
29. As an Admin, I want the Register to show one row per Employee and one column per day from Monday to Sunday, so that I can read the week like the paper book.
30. As an Admin, I want each Register cell to show the first Clock in and last Clock out of the day (e.g. `09:00–17:30`), so that I see each person's day at a glance.
31. As an Admin, I want each cell to show the hours actually worked, excluding gaps between Time entries, so that lunch breaks aren't counted.
32. As an Admin, I want a marker on a cell when there was more than one Time entry that day, so that I know there's detail behind the summary.
33. As an Admin, I want to click a cell to see that day's individual Time entries, so that I can inspect exactly what was recorded.
34. As an Admin, I want a Total column with each Employee's hours for the week, so that I don't have to add it up myself.
35. As an Admin, I want a cell for an Employee who is currently On site to show `–now` and count hours up to the present, so that today's column is live.
36. As an Admin, I want a Missed clock-out shown in red as `–?`, with only the completed Time entries counted in that day's hours, so that problems stand out and don't inflate totals.
37. As an Admin, I want Corrected Time entries to carry a visible marker, with the reason shown on hover, so that I can tell edited data from original data.
38. As an Admin, I want to move to the previous and next week, so that I can review history.
39. As an Admin, I want Deactivated Employees to still appear in weeks where they have Time entries, so that history stays complete.
40. As an Admin, I want an Employee's name in the Register to open their Timesheet, so that I can focus on one person's week.

### Admin: Timesheet, On site now, Needs correction

41. As an Admin, I want an Employee's Timesheet to list every Time entry in the week with its Clock in, Clock out and duration, plus the week's total, so that I can review one person in detail.
42. As an Admin, I want to move between weeks on a Timesheet, so that I can review that Employee's history.
43. As an Admin, I want an On site now list of every Employee currently On site, with their Clock in time, so that I can do a fire roll-call.
44. As an Admin, I want Employees with a Missed clock-out excluded from On site now, so that the roll-call doesn't list people who went home yesterday.
45. As an Admin, I want a Needs correction list of all Missed clock-outs, oldest first, so that I can work through the problems.

### Admin: Corrections

46. As an Admin, I want to change the Clock in or Clock out time of a Time entry, so that I can fix a wrong or missing time.
47. As an Admin, I want to close a Missed clock-out by setting its Clock out time, so that the Employee's hours become correct.
48. As an Admin, I want to add a Time entry for an Employee who forgot to Clock in at all, so that their worked hours are recorded.
49. As an Admin, I want to void a Time entry that should never have existed, so that it no longer counts towards hours.
50. As an Admin, I want every Correction to require a reason, so that anyone reviewing the data later understands why it changed.
51. As an Admin, I want the previous state of a Time entry kept when I correct it, so that nothing is silently rewritten.
52. As an Admin, I want to see the Correction history of a Time entry (what changed, when, why), so that I can audit it.
53. As an Admin, I want to make Corrections directly from the Register and the Timesheet, so that I can fix a problem where I spot it.
54. As an Admin, I want a Correction rejected if its Clock out isn't after its Clock in, so that impossible Time entries can't be created.
55. As an Admin, I want a Correction rejected if it would make two of an Employee's Time entries overlap, so that hours can't be double-counted.
56. As an Admin, I want voided Time entries hidden from totals but still visible in the entry detail, so that history isn't lost.

### Admin: Employees

57. As an Admin, I want to add an Employee with a name and a 4-digit PIN, so that they can start using the Kiosk.
58. As an Admin, I want to rename an Employee, so that I can fix typos or name changes.
59. As an Admin, I want to set a new PIN for an Employee, so that someone who forgot theirs can carry on.
60. As an Admin, I want to Deactivate an Employee who has left, so that they disappear from the Kiosk while their history is kept.
61. As an Admin, I want to reactivate a Deactivated Employee, so that someone who returns keeps their history.
62. As an Admin, I want to see all Employees with their active or Deactivated status, so that I know who's on the Kiosk.
63. As an Admin, I want to clear an Employee's PIN lockout, so that someone locked out by mistake doesn't have to wait.

### Owner: deployment and operations

64. As the owner, I want every push and pull request to `main` to run lint, typecheck, tests and a build, so that I find breakage before releasing.
65. As the owner, I want pushing a `v*` git tag to build, publish and deploy the app to my Raspberry Pi automatically, so that releasing feels like Vercel.
66. As the owner, I want the deploy's success or failure visible in GitHub Actions, so that I know whether the release worked.
67. As the owner, I want database migrations to run automatically on deploy, with the old version left running if they fail, so that a bad migration doesn't take the app down.
68. As the owner, I want to roll back by re-deploying the previous tag, so that recovering from a bad release is one action.
69. As the owner, I want the app reachable only over my Tailscale network with HTTPS, so that it isn't exposed to the internet and I don't need a domain.
70. As the owner, I want a nightly database backup written to the Pi's SSD, so that I can recover from mistakes or corruption.
71. As the owner, I want to run the whole stack locally with one Docker Compose command, so that development matches production.
72. As the owner, I want the workplace time zone set in configuration, so that days and weeks line up with local time.

## Implementation Decisions

### Stack (settled)

- TypeScript and Next.js (App Router) on Node 24, with React 19 (UI SDK requires it). pnpm as the package manager.
- Postgres as the database and Drizzle as the ORM and migration tool.
- Better Auth for the Admin login (email and password, Drizzle adapter).
- shadcn/ui for the theme, tokens and all standard components.
- UI SDK (`@ui-sdk/react`, `@ui-sdk/core`, beta) **only** for the Kiosk name picker, composed from the listbox, typeahead and roving-focus behaviours and styled with shadcn tokens. See ADR-0002. If UI SDK doesn't work out, fall back to shadcn's Command for that picker.

### Module structure

**The Attendance module** is the one deep module that holds every domain rule. The Next.js layer (pages, server actions, route handlers) is a thin shell: it authenticates, parses input, calls the Attendance module and renders the result. No domain rule lives in the web layer.

- Every operation takes the current time (`now`) explicitly as an argument instead of reading the clock itself. The web layer passes the real time, and tests pass fixed times.
- The workplace time zone comes from configuration and is used for all day and week boundaries.
- The interface is a set of commands and queries named in the Glossary's language:
  - **Kiosk:** tap (Employee, PIN, Kiosk, now), which returns either Clocked in, Clocked out (with hours today), Wrong PIN, or Locked out (with the time it ends), plus an undo handle on success. **Undo** (undo handle, now) works only within 10 seconds of the tap.
  - **Kiosk management:** activate (name), returning a device token. Resolve a token to a Kiosk, or none if it is unknown or revoked. List Kiosks. Revoke a Kiosk.
  - **Employees:** add (name, PIN), rename, set PIN, Deactivate, reactivate, clear lockout, list.
  - **Corrections:** change times (Time entry, new Clock in and/or Clock out, reason), add Time entry (Employee, Clock in, Clock out, reason), void (Time entry, reason). Each returns success or a validation failure: Clock out not after Clock in, overlap, missing reason, or Time entry not found or already voided.
  - **Queries:** Register (week), Timesheet (Employee, week), On site now, Needs correction, Correction history (Time entry). Each takes `now`.

### Domain rules (all inside the Attendance module)

- **Open entries and the 16-hour rule.** A Time entry with no Clock out is open. An open entry whose Clock in is more than 16 hours before `now` is a **Missed clock-out**; otherwise it makes the Employee **On site**. Missed clock-out is derived at query time from `now` and is never stored.
- **Toggle.**
  - If the Employee is On site, a tap clocks them out of that open Time entry.
  - Otherwise the tap clocks them in, creating a new Time entry, even if they have a Missed clock-out.
  - Voided entries are ignored.
- **PIN and lockout.**
  - The PIN is 4 digits, set by the Admin and stored with a slow password hash, never in plain text.
  - PINs don't have to be unique, because the Employee picks their name first.
  - 5 consecutive wrong PINs lock that Employee out at every Kiosk for 5 minutes. A correct PIN resets the count, and the Admin can clear a lockout.
  - A locked-out tap doesn't check the PIN.
- **Undo.**
  - Undoing a Clock in deletes the Time entry it created. Undoing a Clock out reopens the entry.
  - Undo isn't a Correction and leaves no history.
  - It's accepted only within 10 seconds of the tap, only for the Kiosk that made the tap, and only if nothing has changed that Time entry since.
- **Day and week.**
  - A Time entry belongs to the calendar day of its Clock in in the workplace time zone, even if it ends after midnight.
  - Weeks run Monday to Sunday.
  - Durations are exact to the minute, with no rounding.
- **Register cell.** For each Employee and day, over that day's non-voided Time entries:
  - The span runs from the earliest Clock in to the latest Clock out.
  - If the last entry is open, the span shows **now** when the Employee is On site and **unknown** when it's a Missed clock-out.
  - **Hours** are the sum of completed entries' durations, plus `now − Clock in` for an On site entry. A Missed clock-out contributes nothing.
  - The cell also carries the number of entries, and flags for "has a Missed clock-out" and "has a Corrected entry".
- **Register rows.** All active Employees, plus Deactivated Employees with at least one Time entry in the week. Each row has a weekly Total.
- **Corrections.**
  - Every Correction needs a non-empty reason and records the Admin, the time, the kind (change, add or void), and the Time entry's state before and after.
  - Corrections may not produce a Clock out at or before its Clock in, or overlapping non-voided Time entries for the same Employee.
  - A voided Time entry can't be corrected again.
  - Changing times on a Missed clock-out is how the Admin closes it.
- **Deactivation.**
  - A Deactivated Employee doesn't appear on the Kiosk and can't tap.
  - Their Time entries are untouched and still count in their history.
  - Deactivating an On site Employee is allowed and leaves the open entry as it is.

### Schema (outline)

Better Auth's own tables hold the Admin, plus these domain tables:

- **Employee:** name, PIN hash, Deactivated-at (null while active), count of consecutive wrong PINs, locked-until.
- **Time entry:** Employee, Clock in, Clock out (nullable), voided-at (nullable), and whether it was created at a Kiosk or by a Correction.
- **Correction:** Time entry, kind (change, add, void), previous and new values, reason, Admin, made-at.
- **Kiosk:** name, hashed device token, activated-at, revoked-at (nullable).

### Kiosk device trust

- Activating a Kiosk happens in the Admin area on the device itself. The server creates a long random device token, stores only its hash, and sets it on that device as an HTTP-only, long-lived cookie.
- Every Kiosk page and action resolves the cookie to a Kiosk, and refuses when the token is missing, unknown or revoked.
- Kiosk taps never need an Admin session.

### Admin authentication

- Better Auth handles email and password, with public sign-up disabled.
- On startup, if no Admin exists, one is created from the configured email and initial password.
- A command-line script, run inside the app container on the Pi, resets the Admin's password.
- Every Admin page and action requires an Admin session.

### Configuration

All configuration comes from environment variables: database connection, auth secret, initial Admin email and password, and the workplace time zone.

### Deployment (per ADR-0001)

- **Images and services.** A multi-stage Docker build produces a Next.js standalone image. Docker Compose defines four services:
  - the app
  - Postgres, with its data on the SSD
  - a one-off migrate service, which the app depends on completing successfully
  - a nightly backup service that writes `pg_dump` files to the SSD, keeping a rolling window of recent dumps
- **CI workflow** (push and PR to `main`): install, lint, typecheck, unit and integration tests, build, then Playwright E2E against the app running under Compose.
- **Release workflow** (`v*` tag):
  1. Build the arm64 image on GitHub's hosted ARM runner and push it to GHCR, tagged with the version.
  2. Join the tailnet with an ephemeral Tailscale credential.
  3. SSH to the Pi, set the image tag, and run `docker compose pull` followed by `docker compose up -d`. Migrations run before the new app container starts, and if they fail the old container keeps serving.
- **Rollback** is re-running the release for the previous tag.
- **Access.** The Pi exposes the app to the tailnet with Tailscale Serve (HTTPS on its `*.ts.net` name). There's no public exposure and no domain.

## Testing Decisions

- **What makes a good test here:** it exercises behaviour through a public interface and asserts on outcomes a user would recognise. Examples: "the tap returns Clocked out with 7h 45m today", "the Register cell shows 09:00–17:30 with 2 entries". It never asserts on internal calls, SQL or table shapes. Tests should read like the scenarios from the design discussion, use the Glossary's words, and survive any refactor that keeps behaviour the same.
- **Seam 1, the Attendance module interface (the main seam).** Nearly all tests live here.
  - They call the module's commands and queries against a **real Postgres running in-process (PGlite)**, with the project's Drizzle migrations applied, and each test gets a fresh database.
  - Every call passes an explicit `now`, so time-based rules are exact and repeatable.
  - Coverage includes:
    - the toggle
    - the 16-hour Missed clock-out boundary
    - a Clock in after a Missed clock-out
    - overnight Time entries
    - multiple entries per day
    - PIN failure, lockout, expiry and reset
    - the Undo window and Undo after a change
    - every part of a Register cell (span, hours, `now` and unknown ends, markers)
    - weekly totals and week boundaries in the workplace time zone
    - each kind of Correction and every validation failure
    - Correction history
    - On site now excluding Missed clock-outs
    - Needs correction ordering
    - Deactivation and reactivation
    - Kiosk activation, resolution and revocation
- **Seam 2, end-to-end browser tests (thin).** A handful of Playwright tests run against the real app under Docker Compose in CI. They prove the wiring, not the rules:
  - activate a Kiosk → tap a name → enter the PIN → see the confirmation → Undo
  - a non-Kiosk device sees "not a Kiosk"
  - Admin login → Register shows the tap → open a cell → make a Correction with a reason → the marker appears
- **Not tested on their own:** individual React components (including the UI SDK picker beyond the E2E path), Drizzle queries in isolation, and Better Auth internals.
- **Tooling:** Vitest for Seam 1, Playwright for Seam 2.
- **Prior art:** none yet, because this is a greenfield repo. The first Attendance-module tests set the pattern for the rest.

## Out of Scope

- CSV or spreadsheet export.
- Any AI feature, including natural-language questions about attendance.
- Schedules, shifts, lateness or absence.
- Multiple workplaces or locations.
- Employee accounts, Employees viewing their own hours, and Employees changing their own PIN.
- More than one Admin, Admin roles, and password reset by email (or any email at all).
- A "break" concept: breaks are only the gaps between Time entries.
- Rounding rules, overtime and payroll calculations.
- Public internet access (Tailscale Funnel or a domain), preview deployments and off-site backups.
- Offline Kiosk operation: if the Pi is unreachable, the Kiosk can't clock anyone, and the Admin fixes it afterwards with Corrections.

## Further Notes

- **Two decisions made while writing this spec** that weren't discussed explicitly. Reopen them if they're wrong:
  - Corrections that would make an Employee's Time entries overlap are rejected.
  - The Admin can clear a PIN lockout early.
- **Human-only setup.** Several one-time steps can only be done by the owner, and they're a good fit for `/wizard`:
  - initialising the git repo and creating the GitHub repo
  - installing Docker and Tailscale on the Pi and enabling Tailscale Serve
  - creating the Tailscale credential and SSH key for Actions
  - adding the GitHub secrets
  - letting the Pi pull from GHCR
  - installing Tailscale on the Kiosk tablet
- **UI SDK is beta** (first release November 2026), and its APIs may change. Keep it confined to the Kiosk picker (ADR-0002).
- **Glossary.** The vocabulary is defined in `GLOSSARY.md` (Employee, Admin, Kiosk, Clock in/out, Time entry, On site, Missed clock-out, Correction, Voided, Register, Timesheet, Deactivated). Use it in code, UI copy and tests.
