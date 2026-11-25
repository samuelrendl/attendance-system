# Attendance System

Records when employees arrive at and leave a single workplace, replacing a paper sign-in register.

## Language

### People

**Employee**:
A person who works at the workplace and records their attendance at the Kiosk.
_Avoid_: staff, worker, user

**Admin**:
The person who manages Employees and reviews and corrects Time entries.
_Avoid_: manager, owner

**Deactivated**:
An Employee who no longer works at the workplace. They no longer appear on the Kiosk, but their Time entries are kept.
_Avoid_: deleted, archived, removed

### Attendance

**Kiosk**:
The shared screen at the workplace entrance where Employees Clock in and Clock out. Only a device the Admin has activated as a Kiosk can act as one, until the Admin revokes it. There may be several.
_Avoid_: terminal

**Clock in**:
An Employee recording at the Kiosk that they have arrived at the workplace.
_Avoid_: sign in, check in

**Clock out**:
An Employee recording at the Kiosk that they have left the workplace.
_Avoid_: sign out, check out

**Time entry**:
One Employee's span at the workplace, from a Clock in to its matching Clock out. A Time entry without a Clock out yet is **open**. A Time entry belongs to the day of its Clock in. An Employee may have several Time entries in one day.
_Avoid_: shift, visit, attendance record, session

**On site**:
The state of an Employee who has an open Time entry that is not a Missed clock-out.
_Avoid_: present, in

**Missed clock-out**:
An open Time entry that has stayed open more than 16 hours because the Employee forgot to Clock out. It waits for a Correction.
_Avoid_: stale entry, orphaned entry

### Review

**Correction**:
A change an Admin makes to the Time entries: changing an entry's times, adding a missing entry, or voiding a wrong one. It always carries a reason, and the previous state is kept.
_Avoid_: edit, adjustment, override

**Voided**:
A Time entry an Admin has cancelled through a Correction. It is kept for history but no longer counts towards hours.
_Avoid_: deleted, removed

**Register**:
All Employees' Time entries for one week, laid out with one row per Employee and one column per day. It is the Admin's main view.
_Avoid_: overview, dashboard, attendance sheet

**Timesheet**:
One Employee's Time entries for one week, with their total hours: one row of the Register, opened in detail.
_Avoid_: report, log
