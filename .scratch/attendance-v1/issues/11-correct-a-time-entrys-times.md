# 11: Correct a Time entry's times

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** From a Register cell's Time entries, and from the Timesheet, the Admin can open a **Correction** dialog for a Time entry. There they change its Clock in and/or Clock out, and they must give a reason. Closing a Missed clock-out works the same way, by setting its Clock out.

A Correction is rejected if:
- its Clock out isn't after its Clock in
- it would make that Employee's non-voided Time entries overlap
- the reason is empty

Every Correction records the Admin, the time, the reason and the state before and after. The Admin can view a Time entry's Correction history. Corrected Time entries carry a marker in the Register and the Timesheet, with the reason shown on hover.

This ticket also adds a **Needs correction** list in the admin area: every Missed clock-out, oldest first, each one linking to its Correction dialog.

**Blocked by:** 09 (The Register)

**Status:** ready-for-agent

- [ ] The Admin can change a Time entry's Clock in and/or Clock out, with a reason, from the Register cell detail and the Timesheet
- [ ] Setting a Clock out on a Missed clock-out closes it, and the Register's hours update
- [ ] Each validation failure shows a clear message and changes nothing
- [ ] The Correction history shows each change: before, after, reason, Admin and time
- [ ] Corrected Time entries show a marker with the reason on hover
- [ ] The Needs correction list shows Missed clock-outs oldest first, and a corrected one leaves the list
- [ ] Attendance-module tests cover each rule above
- [ ] Playwright E2E: Admin login → Register → open a cell → correct a Time entry with a reason → the marker appears
