# 13: Production image and Compose stack

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Make the app run as the production stack from ADR-0001, locally with one Docker Compose command:

- a multi-stage Docker image using Next.js standalone output
- an app service
- a Postgres service with persistent data
- a one-off **migrate** service that the app waits on, so the app only starts if migrations succeed
- a nightly backup service that writes `pg_dump` files to a mounted directory, keeping a rolling window of recent dumps

The image must build for arm64 as well as amd64. CI's Playwright E2E switches to running against this Compose stack.

**Blocked by:** 01 (Walking skeleton)

**Status:** resolved

- [x] One Compose command starts Postgres, runs migrations, then starts the app
- [x] A failing migration stops the app from starting, and a previously running app container is left untouched
- [x] The image uses standalone output and builds for both arm64 and amd64
- [x] The backup service produces a restorable `pg_dump` on schedule (and on demand for testing) into a mounted directory, pruning old dumps
- [x] All configuration comes from environment variables, and an example env file documents them
- [ ] CI runs the Playwright E2E against the Compose stack

## Comments

**2026-11-27 (agent):** Built the `Dockerfile` (multi-stage, `node:24-slim`, standalone output, runs as `node`) and a four-service `compose.yaml` (db, migrate, app, backup). README "Production stack" has the commands. I verified all of the following with Docker Desktop under project `att13`:

- `docker compose up --build --detach --wait` brings everything up and the app is healthy.
- The Playwright smoke test passes against the stack with `E2E_BASE_URL`.
- An amd64+arm64 `buildx` build succeeds, and the arm64 image serves under emulation.
- Dumps happen on demand and on a one-minute test schedule, and pruning down to `BACKUP_KEEP` works.
- A dump restores with `pg_restore` into a fresh database.
- A directory holding only `compose.yaml` and a Pi-style `.env` runs the whole stack.

- **How migrate runs in production:** the image has no drizzle-kit. `scripts/migrate.ts` calls drizzle-orm's `migrate()` (node-postgres) on `./drizzle`. `pnpm build` runs `build:scripts` (esbuild), which bundles every `scripts/*.ts` into a self-contained `dist/<name>.mjs` (`build-scripts.mjs`). The image ships `/app/dist` next to `server.js`, and migrate runs `node dist/migrate.mjs`. It writes to the same `drizzle.__drizzle_migrations` table as `pnpm db:migrate`. All pending migrations run in one transaction, so a failure changes nothing and exits 1.
- **Deploy order matters (ticket 15):** a bare `docker compose pull && docker compose up -d` is NOT safe. I tested it: Compose recreates the app container (removing the old one) before migrate has finished. When migrate fails, the new app is left "Created" and nothing is serving. The safe sequence, also tested, is `docker compose pull && docker compose run --rm migrate && docker compose up --detach --wait`. `run` leaves the running app alone (same container ID afterwards) and exits non-zero on failure. That's why the second box is ticked on the condition that this sequence is used.
- **Image:** `${IMAGE:-ghcr.io/samuelrendl/attendance-system}:${IMAGE_TAG:-local}`. On the Pi, ticket 15 should write `IMAGE_TAG=<version>` into `~/attendance/.env` rather than only exporting it, so that a later manual `docker compose up` doesn't fall back to `local`. Only `compose.yaml` and `.env` are needed on the Pi. The backup script is inline in the backup service's `command`, not a mounted file. A `configs:` entry was tried first and dropped, because Compose doesn't recreate the container when a config's content changes.
- **Configuration:** app and migrate use `env_file: .env`, so new variables (ticket 02's auth secret and Admin email/password) reach the app with no compose edit. Add them to `.env.example` only. Compose sets `DATABASE_URL` to `db:5432` from `POSTGRES_USER/PASSWORD/DB` (defaults `attendance`), overriding `.env`'s host value. That matches the Pi's `.env` from ticket 14. Host ports are `DB_PORT` (5432) and `APP_PORT` (3000), both bound to 127.0.0.1. `BACKUP_DIR` defaults to `./backups`, `BACKUP_SCHEDULE` to `0 2 * * *` (in `WORKPLACE_TIME_ZONE`), and `BACKUP_KEEP` to 14.
- **Merged with ticket 02:** 02's one-file esbuild command was replaced by the generic `build-scripts.mjs`, which outputs to `dist/` too, so 02's `dist/reset-admin-password.mjs` and `pnpm admin:reset-password` are unchanged. Inside the stack, `echo <pw> | docker compose exec -T app node dist/reset-admin-password.mjs` works. The Admin is seeded on start, and the migrate service applied both migrations. All 5 Playwright tests pass against the Compose stack. New container commands go in `scripts/<name>.ts`, which may import from `@/...`.
- **Not verified:** the CI box. `ci.yml` now copies `.env.example` to `.env` as its first step. That replaces the job-level env block: Compose's app and Playwright have to agree on the seeded Admin password, so both now read `.env`. It then runs `docker compose up --build --detach --wait`, then Playwright with `E2E_BASE_URL=http://localhost:3000` (localhost, to match `BETTER_AUTH_URL`'s origin), and adds an `image-arm64` job that runs `docker build .` on `ubuntu-24.04-arm`. I ran the same steps locally, but not on GitHub. Tick it once the first push is green.
- `pnpm start` (`next start`) still works with `output: "standalone"`, so local `pnpm test:e2e` without `E2E_BASE_URL` is unchanged.

**2026-11-28 (agent, orchestrator):** Resolved. The one unticked box ("CI runs the Playwright E2E against the Compose stack") is ticked by the first green CI run on `main`, when the owner merges `attendance-v1` (see ticket 15's release steps).
