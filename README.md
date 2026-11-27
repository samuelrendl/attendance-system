# Attendance system

Replaces a paper sign-in register: Employees Clock in and out at a Kiosk, and the Admin reviews and corrects Time entries. See `GLOSSARY.md` for the language and `docs/adr/` for the big decisions.

## Requirements

- Node 24 and pnpm (the version is pinned in `package.json`)
- Docker, for the local Postgres and the production stack

## Run it locally

```sh
pnpm install
cp .env.example .env
docker compose up --detach --wait db
pnpm db:migrate
pnpm dev
```

Then open http://localhost:3000/admin.

To run the whole production stack instead, see [Production stack](#production-stack).

No Docker? `pnpm db:local` serves an in-memory Postgres (PGlite) on port 5432 instead. Run it in its own terminal, point `DATABASE_URL` at `postgres://postgres:postgres@127.0.0.1:5432/postgres`, then carry on from `pnpm db:migrate`. Its data is gone when it stops.

## Configuration

Every setting is an environment variable; `.env.example` documents them.

| Variable              | Meaning                                                   |
| --------------------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string                                |
| `WORKPLACE_TIME_ZONE` | IANA time zone (e.g. `Europe/London`) for days and weeks |

The settings for Compose itself (image tag, Postgres credentials, host ports, backups) are in the "Compose" section of `.env.example`.

## Scripts

| Script             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `pnpm lint`        | ESLint                                                        |
| `pnpm typecheck`   | Generates Next.js route types, then runs `tsc`               |
| `pnpm test`        | Vitest: the Attendance module against in-process Postgres     |
| `pnpm build`       | Production build (standalone server), plus `build:scripts`   |
| `pnpm build:scripts` | Bundles each `scripts/*.ts` into `dist/scripts/*.mjs` for the image |
| `pnpm test:e2e`    | Playwright against the production build (run `build` first)  |
| `pnpm db:generate` | Generates a migration from `src/attendance/schema.ts`         |
| `pnpm db:migrate`  | Applies migrations to `DATABASE_URL`                          |
| `pnpm db:local`    | In-memory Postgres (PGlite) on port 5432, for when there's no Docker |

## Layout

- `src/attendance/`: the **Attendance module**, the one home for every domain rule. Every operation takes `now` explicitly. Tests live next to it and run against PGlite with the real migrations.
- `src/server/`: wiring for the web layer (configuration, the database connection).
- `src/app/`: Next.js pages. They call the Attendance module and render; no domain rules live here. (Admin login arrives in ticket 02, after which every admin page also checks the Admin session.)
- `drizzle/`: migrations.
- `scripts/`: `*.ts` are command-line scripts that run inside the app container (`migrate`), each bundled into one self-contained file. `setup-pi.sh` is the one-time Pi setup wizard.
- `Dockerfile`, `compose.yaml`: the production image and stack (see below).
- `e2e/`: Playwright tests.

## Production: one-time Pi setup

The app runs on a Raspberry Pi over Tailscale (see `docs/adr/0001-self-host-on-raspberry-pi.md`). To set up a Pi, Tailscale and the GitHub secrets for releases, run the wizard in Git Bash from the repo:

```sh
./scripts/setup-pi.sh
```

It walks through each step, runs the Pi's commands over SSH, and keeps its answers in `.env.pi` (git-ignored), so it can be re-run safely. On the Pi, the app lives in `~/attendance/`, with its settings in `~/attendance/.env`.

## Production stack

`compose.yaml` is the stack from ADR-0001, the same locally and on the Pi:

- **db**: Postgres 18, data in the `db-data` volume.
- **migrate**: runs `node scripts/migrate.mjs` (Drizzle's migrator, bundled; the image has no drizzle-kit) and exits. It uses the same migrations table as `pnpm db:migrate`, and each run is one transaction, so a failing migration changes nothing.
- **app**: the Next.js standalone server from the `Dockerfile`, `${IMAGE}:${IMAGE_TAG}`. It starts only after migrate succeeds. Host port `APP_PORT` (3000), on 127.0.0.1.
- **backup**: `pg_dump` on `BACKUP_SCHEDULE` (02:00 nightly, in `WORKPLACE_TIME_ZONE`) into `BACKUP_DIR` (`./backups`), keeping the newest `BACKUP_KEEP` (14).

The app and migrate services get every variable in `.env` (`env_file`), with `DATABASE_URL` pointed at the `db` service. `compose.yaml` and `.env` are the only files the stack needs.

Run it all locally (one command; it builds the image):

```sh
cp .env.example .env
docker compose up --build --detach --wait
```

Then open http://localhost:3000/admin. `docker compose down` stops it (add `--volumes` to delete the data).

**Deploying a new version** (what the release does on the Pi):

```sh
docker compose pull
docker compose run --rm migrate
docker compose up --detach --wait
```

Run migrate on its own first. `docker compose up` recreates the app container before the migrate service has finished. A failing migration would then leave the old app container already removed and the new one never started. `run --rm migrate` doesn't touch the running app, and it exits non-zero if a migration fails, so stop there and the old version keeps serving.

**Backups.** Take one now with `docker compose exec backup backup`. To restore a dump into an empty database:

```sh
docker compose exec backup sh -c 'pg_restore --no-owner --dbname=attendance /backups/attendance-<timestamp>.dump'
```

(For a database that already has data, add `--clean --if-exists`.)

**Commands in the app container.** The image ships the bundled `scripts/` next to `server.js`, so run one with `docker compose exec app node scripts/<name>.mjs`. To add one, create `scripts/<name>.ts` (it may import from `@/...`).

**Images** build natively for linux/amd64 and linux/arm64 (the Pi). CI checks the arm64 build on an ARM runner.

## Known issue: `pnpm add` with pnpm 10.25

pnpm 10.25 crashes on `pnpm add` ("Cannot read properties of undefined (reading 'manifest')") whenever `components.json` is in the project root, which also breaks `shadcn init` and can break `shadcn add`. Until that's fixed, add the dependency to `package.json` by hand and run `pnpm install`, or move `components.json` aside for the `pnpm add`.
