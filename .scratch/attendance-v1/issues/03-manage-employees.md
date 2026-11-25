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

- [ ] The Admin can add an Employee with a name and a PIN of exactly 4 digits; anything else is rejected
- [ ] The PIN is never stored or displayed in plain text
- [ ] Two Employees may share a PIN
- [ ] The Admin can rename an Employee and set a new PIN
- [ ] The Admin can Deactivate and reactivate an Employee; Deactivated Employees are clearly marked in the list
- [ ] Attendance-module tests cover adding, renaming, re-PINing, Deactivating, reactivating and PIN validation
