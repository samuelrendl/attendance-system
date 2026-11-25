# 07: Undo at the Kiosk

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** The Kiosk confirmation offers an **Undo** button for 10 seconds, for accidental double taps.

- Undoing a Clock in removes the Time entry it created.
- Undoing a Clock out reopens the Time entry.

Undo isn't a Correction and leaves no history. It's accepted only within 10 seconds, only from the Kiosk that made the tap, and only if nothing has changed that Time entry since.

**Blocked by:** 05 (Clock in and out at the Kiosk)

**Status:** ready-for-agent

- [ ] The confirmation shows Undo with a visible 10-second countdown, then returns to the name list
- [ ] Undoing a Clock in leaves the Employee as if they never tapped (not On site, no Time entry)
- [ ] Undoing a Clock out leaves the Employee On site with the same open Time entry
- [ ] Undo after 10 seconds, from another Kiosk, or after the Time entry changed is refused
- [ ] Attendance-module tests cover each of the above using `now`
- [ ] The Playwright E2E from ticket 05 is extended: tap → Undo → the Employee is not On site
