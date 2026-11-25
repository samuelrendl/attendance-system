# 10: Timesheet

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Clicking an Employee's name in the Register opens their **Timesheet** for that week: every Time entry with its day, Clock in, Clock out and duration, plus the week's total. Previous and next buttons move between weeks. The totals must agree with the Register, so the Timesheet query reuses the same Attendance-module rules.

**Blocked by:** 09 (The Register)

**Status:** ready-for-agent

- [ ] Clicking a name in the Register opens that Employee's Timesheet for the same week
- [ ] Every Time entry in the week is listed with its day, Clock in, Clock out (or On site / Missed clock-out) and duration
- [ ] The week's total matches that Employee's Register Total
- [ ] Previous and next week work
- [ ] Attendance-module tests cover the Timesheet query, including agreement with the Register
