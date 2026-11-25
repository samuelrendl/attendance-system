# 08: Kiosk name picker with UI SDK

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Replace the Kiosk's plain name list with a picker built with UI SDK, as ADR-0002 decides. It's composed from the listbox, typeahead and roving-focus behaviours, and styled with shadcn tokens. The picker:

- shows a grid of active Employees
- filters the grid as you type the first letters of a name
- works with arrow keys and with touch
- shows a status dot on each name for whether that Employee is On site

UI SDK is used nowhere else in the app. If UI SDK can't do the job, fall back to shadcn's Command and note why on this ticket.

**Blocked by:** 05 (Clock in and out at the Kiosk)

**Status:** ready-for-agent

- [ ] The Kiosk shows active Employees as a grid, each with an On site status dot
- [ ] Typing filters the grid by name
- [ ] Arrow keys move focus through the grid and Enter selects; touch selects with one tap
- [ ] Selecting a name leads to the PIN step as before
- [ ] UI SDK (`@ui-sdk/react`, `@ui-sdk/core`) is used only in this picker
- [ ] The existing Kiosk Playwright E2E still passes
