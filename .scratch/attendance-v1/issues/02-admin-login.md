# 02: Admin login

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** The Admin can log in with email and password through Better Auth and reach the admin area. Every admin page and action requires an Admin session, and the Admin can log out.

On first start, if no Admin exists, one is created from the configured email and initial password. There is no public sign-up. A command, run inside the app container, resets the Admin's password.

**Blocked by:** 01 (Walking skeleton)

**Status:** resolved

- [x] Visiting the admin area without a session redirects to the login page
- [x] The Admin can log in with the seeded email and password and reach the admin area
- [x] The first start creates the Admin from environment variables, and later starts don't duplicate or overwrite it
- [x] Public sign-up is disabled, so there's no route or action that creates an Admin
- [x] The Admin can log out, after which admin pages require login again
- [x] A reset-password command sets a new password for the Admin
- [x] Better Auth uses the Drizzle adapter, with its tables created by migrations

## Comments

**2026-11-27 (agent):** Implemented. Lint, typecheck, Vitest (13 new tests for Admin access against PGlite) and the build pass. The Playwright tests (4 new in `e2e/admin-login.spec.ts`, plus the smoke test, which now logs in first) pass against the production build on a PGlite server. I also checked by hand that a first start logs "Created the Admin …" and a second start doesn't. Against a live server, the reset command ends the browser's session, refuses the old password and accepts the new one. Not verified: running the command inside the real Docker image, because ticket 13 is building it in parallel.

What later tickets need to know:

- **Checking the Admin session.** `requireAdmin()` from `src/server/admin-session.ts` returns the `Admin` (`{ id, email }`) or redirects to `/login`. Call it in every admin page, inside the `<Suspense>` child after `await connection()`, and as the first line of every admin Server Action and route handler. Don't put it in a layout. `src/app/admin/page.tsx` shows the page pattern. `src/proxy.ts` only redirects visitors with no session cookie at all from `/admin/:path*` to `/login`. It is never the real check. Corrections can record the Admin by `admin.id`, which is `user.id` in Better Auth's `user` table.
- **The Admin access module.** `src/auth/` (`createAdminAuth`) provides `ensureAdmin`, `resetAdminPassword`, `logIn`, `getAdmin` and `logOut`, on top of Better Auth's `auth.api` and `$context.internalAdapter`. **No `/api/auth/[...all]` route handler is mounted.** Better Auth has no HTTP endpoint at all, sign-up included, and sign-up is also disabled in its config. Login and logout are Server Actions. `getServer()` now also returns `adminAuth` (with the `nextCookies()` plugin) and `config`. The tables are in `src/auth/schema.ts` (migration `0001_better_auth`), and `drizzle.config.ts` now lists both schema files. The test helper is `createTestAdminAuth()`, and `createTestDatabase()` is now exported from `src/attendance/testing.ts`.
- **Environment.** New and all required: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`. An `https://` `BETTER_AUTH_URL` makes the session cookie Secure, with a `__Secure-` name prefix. `ADMIN_INITIAL_PASSWORD` needs at least 8 characters and is ignored once an Admin exists. They are documented in `.env.example`, the README and `src/server/config.ts`, and set in `ci.yml`. `playwright.config.ts` loads `.env` so the tests can read the Admin's credentials.
- **Creating the Admin on start.** `src/instrumentation.ts` calls `src/server/startup.ts`. It does nothing once any Admin exists, and it tolerates two starts racing on the first run. If the database is unreachable, it throws "Couldn't check for or create the Admin on start: …", with a hint on what to check. Under `next start`, that error is logged after "Ready", so it doesn't reliably stop the process.
- **The reset-password command (for ticket 13).** `pnpm build` now also runs `pnpm build:scripts` (esbuild), which bundles `scripts/reset-admin-password.ts` into **`dist/reset-admin-password.mjs`**, a single file with no runtime dependencies. The image only needs `COPY --from=builder /app/dist ./dist`, and then you run `docker compose exec app node dist/reset-admin-password.mjs`. On a terminal it asks for the password twice without echoing it. Otherwise it reads one line from stdin: `printf '%s\n' "$NEW" | docker compose exec -T app node dist/reset-admin-password.mjs`. It reads the same environment variables as the app, and it ends every Admin session. Locally, run `pnpm admin:reset-password`. `/dist` is git-ignored and ESLint ignores it.
- **Logout** does a full page load (`window.location.href`), as the Next.js docs recommend, so Activity doesn't keep admin pages mounted after logout.
- **Rate limiting.** Better Auth's rate limiter only applies to its HTTP handler, which isn't mounted, so login attempts aren't rate-limited. That's acceptable on the tailnet. Revisit it if the app is ever exposed.
