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

**Status:** resolved

- [x] The app runs locally against Postgres from Docker Compose, and the admin page shows an empty On site now list
- [x] The Attendance module exists with an On site now query that takes `now` explicitly, and the web layer only calls it
- [x] Drizzle migrations exist and are applied both to the Compose database and to PGlite in tests
- [x] At least one Vitest test exercises the Attendance module through its interface against PGlite with a fixed `now`
- [x] One Playwright smoke test loads the admin page
- [x] CI on push and PR to `main` runs lint, typecheck, Vitest, build and Playwright, and passes
- [x] Node 24, React 19 and pnpm are used, and the workplace time zone and database connection come from environment variables

## Comments

**2026-11-25 (agent):** Implemented. Lint, typecheck, Vitest (2 tests against PGlite) and the production build pass locally. The Playwright smoke test passed against `pnpm build && pnpm start`, after `pnpm db:migrate` had been run against a PGlite socket server (`pnpm db:local`).

There are two things an agent couldn't verify, so they need a human (hence ready-for-human):

- **Compose:** Docker isn't installed on the dev machine, so `docker compose up --detach --wait db` → `pnpm db:migrate` → `pnpm dev` hasn't been run. Migrations *are* applied to PGlite in tests and to a Postgres-protocol server. Tick the first and third boxes once the Compose run works.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, Vitest, build, then Compose Postgres + migrate + Playwright. It can't run until the GitHub repo exists (ticket 14). Tick the CI box when the first push is green.

Note: `pnpm add` crashes in pnpm 10.25 while `components.json` exists (see README). shadcn init was run with npm in a scratch copy, and its files were brought across.

**2026-11-25 (agent):** Verified the rest. Docker Desktop is set up and `docker compose up --detach --wait db` brings up Postgres 18 (healthy), `pnpm db:migrate` creates `employee` and `time_entry`, and `pnpm dev` serves `/admin` with "Nobody is on site.". The Playwright smoke test also passes against the production build on the Compose database. CI run for `ae44491` succeeded: https://github.com/samuelrendl/attendance-system/actions/runs/45711174487. All boxes ticked.
