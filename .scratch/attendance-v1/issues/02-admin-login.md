# 02: Admin login

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** The Admin can log in with email and password through Better Auth and reach the admin area. Every admin page and action requires an Admin session, and the Admin can log out.

On first start, if no Admin exists, one is created from the configured email and initial password. There is no public sign-up. A command, run inside the app container, resets the Admin's password.

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] Visiting the admin area without a session redirects to the login page
- [ ] The Admin can log in with the seeded email and password and reach the admin area
- [ ] The first start creates the Admin from environment variables, and later starts don't duplicate or overwrite it
- [ ] Public sign-up is disabled, so there's no route or action that creates an Admin
- [ ] The Admin can log out, after which admin pages require login again
- [ ] A reset-password command sets a new password for the Admin
- [ ] Better Auth uses the Drizzle adapter, with its tables created by migrations
