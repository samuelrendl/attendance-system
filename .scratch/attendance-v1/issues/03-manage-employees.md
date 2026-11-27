# 03: Manage Employees

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** In the admin area, the Admin can:

- see all Employees with their active or Deactivated status
- add an Employee with a name and a 4-digit PIN
- rename an Employee
- set a new PIN
- Deactivate an Employee who has left, and reactivate them later

PINs are stored only as a slow password hash, and they don't have to be unique. All rules live in the Attendance module.

**Blocked by:** 02 (Admin login)

**Status:** ready-for-agent

- [x] The Admin can add an Employee with a name and a PIN of exactly 4 digits; anything else is rejected
- [x] The PIN is never stored or displayed in plain text
- [x] Two Employees may share a PIN
- [x] The Admin can rename an Employee and set a new PIN
- [x] The Admin can Deactivate and reactivate an Employee; Deactivated Employees are clearly marked in the list
- [x] Attendance-module tests cover adding, renaming, re-PINing, Deactivating, reactivating and PIN validation

## Comments

**2026-11-27 (agent):** Implemented. Lint, typecheck, Vitest (25 new Attendance-module tests in `src/attendance/employees.test.ts`) and the build pass. All Playwright tests pass against the production build on a PGlite server, including a new `e2e/employees.spec.ts` that adds, renames, re-PINs, Deactivates and reactivates an Employee. Nothing left unverified.

What later tickets need to know:

- **The module.** `src/attendance/employees.ts` (`employeeManagement`, spread into `createAttendance` like `kioskManagement`) provides `addEmployee({ name, pin })`, `renameEmployee(id, name)`, `setEmployeePin(id, pin)`, `deactivateEmployee(id, now)`, `reactivateEmployee(id)`, `listEmployees()` (by name, Deactivated included) and `findEmployee(id)`. An Employee is `{ id, name, deactivatedAt }`; the PIN hash never leaves the module. Commands return `{ ok: true }` or `{ ok: false, problems }`, where a problem is `"name-missing"`, `"pin-not-4-digits"` or `"employee-not-found"`. Names are trimmed. An id that isn't a UUID counts as not found, so ids straight from URLs and forms are safe. Deactivating twice keeps the first date.
- **PINs (for ticket 06).** `src/attendance/pin.ts` has `isValidPin`, `hashPin` and `verifyPin`: scrypt (N=2^15, r=8, p=1, 16-byte salt) from `node:crypto`, stored as `scrypt$N$r$p$salt$key`, with no new dependency. `verifyPin` is constant-time and reads the cost from the stored string, so the cost can be raised later without breaking old hashes. A hash takes a few tens of milliseconds.
- **Schema.** Migration `0003_employee_pin_and_deactivation` adds `pin_hash` (not null), `deactivated_at`, `wrong_pin_count` (default 0) and `locked_until` to `employee`. The lockout columns aren't used yet: setting a new PIN or reactivating doesn't touch them. Ticket 06 decides whether they should.
- **Testing a PIN.** Until the Kiosk tap exists, nothing in the module's interface says whether a PIN matches, so `storedPin(db, employeeId)` in `src/attendance/testing.ts` reads the stored hash for the PIN tests. Once ticket 06's tap exists, those tests could check PINs through the tap instead.
- **Pages.** `/admin/employees` (add form and list, with an Active or Deactivated badge on each row) and `/admin/employees/[employeeId]` (rename, set PIN, Deactivate or reactivate). The detail page has no `generateStaticParams` and awaits `params` inside `<Suspense>`. Actions call `revalidatePath("/admin/employees", "layout")`. PIN fields are `type="password"`, so a PIN is never shown, even while the Admin types it.
- **Not done here:** clearing a lockout (ticket 06), hiding Deactivated Employees from the Kiosk (the Kiosk picker ticket should list only Employees with `deactivatedAt === null`), and On site now still lists a Deactivated Employee who has an open Time entry, which the spec allows.
