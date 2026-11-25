# 01: Walking skeleton

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** This is the thinnest working path through every layer, so later tickets only add behaviour. The pieces:

- A Next.js (App Router) app with shadcn/ui initialised.
- Postgres running in local Docker Compose, with Drizzle and a first migration.
- The **Attendance module** as the one home for domain rules, exposing an "On site now" query that takes an explicit `now`. It returns nobody for now, because there are no Employees yet.
- An admin-area page that renders that query.
- The workplace time zone read from configuration.

This ticket also sets up the test harness: Vitest tests call the Attendance module against an in-process Postgres (PGlite) with the Drizzle migrations applied, and each test gets a fresh database. A Playwright smoke test loads the page. CI runs on every push and PR to `main`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The app runs locally against Postgres from Docker Compose, and the admin page shows an empty On site now list
- [ ] The Attendance module exists with an On site now query that takes `now` explicitly, and the web layer only calls it
- [ ] Drizzle migrations exist and are applied both to the Compose database and to PGlite in tests
- [ ] At least one Vitest test exercises the Attendance module through its interface against PGlite with a fixed `now`
- [ ] One Playwright smoke test loads the admin page
- [ ] CI on push and PR to `main` runs lint, typecheck, Vitest, build and Playwright, and passes
- [ ] Node 24, React 19 and pnpm are used, and the workplace time zone and database connection come from environment variables
