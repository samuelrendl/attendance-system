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

Then open http://localhost:3000/admin and log in with `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` from `.env`. The first start creates that Admin.

No Docker? `pnpm db:local` serves an in-memory Postgres (PGlite) on port 5432 instead. Run it in its own terminal, point `DATABASE_URL` at `postgres://postgres:postgres@127.0.0.1:5432/postgres`, then carry on from `pnpm db:migrate`. Its data is gone when it stops.

## Configuration

Every setting is an environment variable; `.env.example` documents them.

| Variable                 | Meaning                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Postgres connection string                                                                    |
| `WORKPLACE_TIME_ZONE`    | IANA time zone (e.g. `Europe/London`) for days and weeks                                     |
| `BETTER_AUTH_SECRET`     | Signs the Admin session cookies; at least 32 characters (`openssl rand -base64 32`)          |
| `BETTER_AUTH_URL`        | The URL the app is served at (`https://<host>.ts.net` on the Pi); `https://` makes cookies Secure |
| `ADMIN_EMAIL`            | The Admin created on the first start                                                          |
| `ADMIN_INITIAL_PASSWORD` | That Admin's first password (at least 8 characters). Ignored once the Admin exists           |

## Scripts

| Script             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `pnpm lint`        | ESLint                                                        |
| `pnpm typecheck`   | Generates Next.js route types, then runs `tsc`               |
| `pnpm test`        | Vitest: the Attendance module and Admin access against in-process Postgres |
| `pnpm build`       | Production build, plus `dist/reset-admin-password.mjs` (see below) |
| `pnpm admin:reset-password` | Sets a new Admin password (prompts for it) and ends every Admin session |
| `pnpm test:e2e`    | Playwright against the production build (run `build` first)  |
| `pnpm db:generate` | Generates a migration from `src/attendance/schema.ts` and `src/auth/schema.ts` |
| `pnpm db:migrate`  | Applies migrations to `DATABASE_URL`                          |
| `pnpm db:local`    | In-memory Postgres (PGlite) on port 5432, for when there's no Docker |

## Admin access

There is exactly one Admin and no public sign-up. On every start, the app creates the Admin from `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` if no Admin exists yet; once one exists, those two variables are ignored.

To reset a forgotten password, run the reset command where the app's environment variables are set. It prompts for the new password twice (or reads one line from stdin), sets it, and logs the Admin out everywhere:

```sh
pnpm admin:reset-password                      # locally, after pnpm build
node dist/reset-admin-password.mjs             # same thing, without pnpm
docker compose exec app node dist/reset-admin-password.mjs   # on the Pi
```

`dist/reset-admin-password.mjs` is a single bundled file with no dependencies, built by `pnpm build`, so the production image only has to copy it.

## Kiosks

To make a device a Kiosk, log in to the admin area on that device, open **Kiosks**, and activate it with a name. The device then gets a long-lived, HTTP-only cookie with a random device token (the database keeps only its hash) and opens `/kiosk`. It stays a Kiosk after the Admin logs out, until the Admin revokes it from the same page. Any other device sees "This device is not a Kiosk" at `/kiosk`. The cookie is Secure when `BETTER_AUTH_URL` is `https://`.

## Layout

- `src/attendance/`: the **Attendance module**, the one home for every domain rule. Every operation takes `now` explicitly. Tests live next to it and run against PGlite with the real migrations.
- `src/auth/`: **Admin access** on Better Auth (Drizzle adapter, sign-up disabled): log in and out, read the Admin session, create the Admin on first start, reset the password. Its tables are in `src/auth/schema.ts`.
- `src/server/`: wiring for the web layer (configuration, the database connection, `requireAdmin()` in `admin-session.ts`, `currentKiosk()` in `kiosk-device.ts`, the start-up hook).
- `src/proxy.ts`: sends visitors without a session cookie from `/admin` to `/login`. Only a fast path; the real check is `requireAdmin()`. On `/kiosk` it sets the Kiosk cookie again, so its expiry keeps moving on.
- `scripts/`: command-line tools. `reset-admin-password.ts` is bundled into `dist/` by `pnpm build`; `setup-pi.sh` is the one-time Pi setup wizard.
- `src/app/`: Next.js pages. They call the Attendance module and render; no domain rules live here. Every admin page and Server Action calls `requireAdmin()` from `src/server/admin-session.ts` first; every Kiosk page and Server Action calls `currentKiosk()` from `src/server/kiosk-device.ts` instead, and never needs an Admin session.
- `drizzle/`: migrations.
- `e2e/`: Playwright tests.

## Production: one-time Pi setup

The app runs on a Raspberry Pi over Tailscale (see `docs/adr/0001-self-host-on-raspberry-pi.md`). To set up a Pi, Tailscale and the GitHub secrets for releases, run the wizard in Git Bash from the repo:

```sh
./scripts/setup-pi.sh
```

It walks through each step, runs the Pi's commands over SSH, and keeps its answers in `.env.pi` (git-ignored), so it can be re-run safely. On the Pi, the app lives in `~/attendance/`, with its settings in `~/attendance/.env`.

## Known issue: `pnpm add` with pnpm 10.25

pnpm 10.25 crashes on `pnpm add` ("Cannot read properties of undefined (reading 'manifest')") whenever `components.json` is in the project root, which also breaks `shadcn init` and can break `shadcn add`. Until that's fixed, add the dependency to `package.json` by hand and run `pnpm install`, or move `components.json` aside for the `pnpm add`.
