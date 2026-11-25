# 09: The Register

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** The **Register** becomes the Admin's landing page. It's a weekly grid with one row per Employee, one column per day from Monday to Sunday in the workplace time zone, and a Total column. Rows show all active Employees, plus Deactivated Employees who have a Time entry that week. Previous and next buttons move between weeks.

Each cell summarises that Employee's day:

- **The span** runs from the earliest Clock in to the latest Clock out, e.g. `09:00–17:30`. If the last Time entry is open, the end shows `–now` when the Employee is On site and a red `–?` when it's a Missed clock-out.
- **The hours** are those actually worked: completed Time entries' durations, plus `now − Clock in` for an On site entry. Gaps aren't counted, and a Missed clock-out adds nothing. Times are exact to the minute.
- **A marker** shows when there was more than one Time entry.

Clicking a cell expands the day's individual Time entries. All of this is computed by an Attendance-module Register query that takes the week and `now`.

**Blocked by:** 05 (Clock in and out at the Kiosk)

**Status:** ready-for-agent

- [ ] After login, the Admin lands on the Register for the current week
- [ ] Cells show the span and hours as described, with a marker for several entries
- [ ] An On site Employee's cell shows `–now` and hours that count up to the present
- [ ] A Missed clock-out shows a red `–?`, and its day's hours count only completed entries
- [ ] The Total column sums each Employee's week
- [ ] Clicking a cell shows that day's Time entries with their Clock in, Clock out and duration
- [ ] Previous and next week work, and a Deactivated Employee appears only in weeks where they have Time entries
- [ ] Attendance-module tests cover: two Time entries with a lunch gap (`09:00–17:30`, 7h 45m, marker); an On site cell; a Missed clock-out cell; an overnight Time entry counted on the Clock in day; week boundaries in the workplace time zone; weekly totals; Deactivated Employee rows
