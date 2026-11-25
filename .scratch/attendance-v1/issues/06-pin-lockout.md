# 06: PIN lockout

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** After 5 consecutive wrong PINs, that Employee is locked out at every Kiosk for 5 minutes. While locked out, a tap doesn't check the PIN, and the Kiosk says they're locked out and until when. The lockout ends by itself.

A correct PIN resets the count of wrong attempts. In the admin area, the Admin can see that an Employee is locked out and clear the lockout early.

**Blocked by:** 05 (Clock in and out at the Kiosk)

**Status:** ready-for-agent

- [ ] The 5th consecutive wrong PIN locks the Employee out for 5 minutes, and the Kiosk shows when the lockout ends
- [ ] While locked out, even the correct PIN is refused
- [ ] After 5 minutes, the Employee can tap again
- [ ] A correct PIN before the 5th failure resets the count
- [ ] The lockout applies to that Employee only, and at every Kiosk
- [ ] The Admin can clear a lockout from the Employees screen
- [ ] Attendance-module tests cover counting, locking, expiry with `now`, resetting and clearing by the Admin
