# Attendance system

Replaces a paper sign-in register: Employees Clock in and out at a Kiosk, and the Admin reviews and corrects Time entries. See `GLOSSARY.md` for the language and `docs/adr/` for the big decisions.

## Requirements

- Node 24 and pnpm (the version is pinned in `package.json`)
- Docker, for the local Postgres

## Run it locally

```sh
pnpm install
cp .env.example .env
docker compose up --detach --wait db
pnpm db:migrate
pnpm dev
```

Then open http://localhost:3000/admin.

No Docker? `pnpm db:local` serves an in-memory Postgres (PGlite) on port 5432 instead. Run it in its own terminal, point `DATABASE_URL` at `postgres://postgres:postgres@127.0.0.1:5432/postgres`, then carry on from `pnpm db:migrate`. Its data is gone when it stops.

## Configuration

Every setting is an environment variable; `.env.example` documents them.

| Variable              | Meaning                                                   |
| --------------------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string                                |
| `WORKPLACE_TIME_ZONE` | IANA time zone (e.g. `Europe/London`) for days and weeks |

## Scripts

| Script             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `pnpm lint`        | ESLint                                                        |
| `pnpm typecheck`   | Generates Next.js route types, then runs `tsc`               |
| `pnpm test`        | Vitest: the Attendance module against in-process Postgres     |
| `pnpm build`       | Production build                                              |
| `pnpm test:e2e`    | Playwright against the production build (run `build` first)  |
| `pnpm db:generate` | Generates a migration from `src/attendance/schema.ts`         |
| `pnpm db:migrate`  | Applies migrations to `DATABASE_URL`                          |
| `pnpm db:local`    | In-memory Postgres (PGlite) on port 5432, for when there's no Docker |

## Layout

- `src/attendance/`: the **Attendance module**, the one home for every domain rule. Every operation takes `now` explicitly. Tests live next to it and run against PGlite with the real migrations.
- `src/server/`: wiring for the web layer (configuration, the database connection).
- `src/app/`: Next.js pages. They call the Attendance module and render; no domain rules live here. (Admin login arrives in ticket 02, after which every admin page also checks the Admin session.)
- `drizzle/`: migrations.
- `e2e/`: Playwright tests.

## Known issue: `pnpm add` with pnpm 10.25

pnpm 10.25 crashes on `pnpm add` ("Cannot read properties of undefined (reading 'manifest')") whenever `components.json` is in the project root, which also breaks `shadcn init` and can break `shadcn add`. Until that's fixed, add the dependency to `package.json` by hand and run `pnpm install`, or move `components.json` aside for the `pnpm add`.
