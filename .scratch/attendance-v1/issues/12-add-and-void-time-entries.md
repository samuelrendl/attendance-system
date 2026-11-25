# 12: Add and void Time entries

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Two more kinds of **Correction**, each with a required reason and full history:

- **Add** a Time entry, for an Employee who forgot to Clock in at all. Example: Tom actually worked 08:00–17:00.
- **Void** a Time entry that should never have existed. Example: Tom's bogus 17:00 Clock in.

A Voided Time entry no longer counts towards hours, On site, Missed clock-out or the Needs correction list. It stays visible, marked as voided, in the cell detail and the Timesheet, and it can't be corrected again. Added Time entries obey the same validation as other Corrections: Clock out after Clock in, and no overlaps.

**Blocked by:** 11 (Correct a Time entry's times)

**Status:** ready-for-agent

- [ ] The Admin can add a Time entry for any Employee and day, with a reason, from the Register and the Timesheet
- [ ] The Admin can void a Time entry with a reason
- [ ] Voided Time entries are excluded from hours, On site and the Needs correction list, but are visible and marked in the detail views
- [ ] A Voided Time entry can't be corrected again
- [ ] Added Time entries are rejected if Clock out isn't after Clock in or if they would overlap
- [ ] Both kinds appear in the Correction history
- [ ] Attendance-module tests cover the Tom scenario end to end: void the 17:00 Clock in, add 08:00–17:00, and see the correct Register cell and total
