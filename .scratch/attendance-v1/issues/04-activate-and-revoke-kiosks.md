# 04: Activate and revoke Kiosks

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** While logged in on a device, the Admin can activate that device as a named Kiosk, for example "Front door tablet". The device receives a long-lived, HTTP-only cookie holding a random device token, and the server stores only the token's hash. An activated Kiosk stays activated across restarts and days.

The Admin can see the list of Kiosks and revoke any of them, after which that device stops working at once. The Kiosk page resolves the cookie to a Kiosk. Any device without a valid, unrevoked token sees "this device is not a Kiosk", and Kiosk pages never need an Admin session.

**Blocked by:** 02 (Admin login)

**Status:** resolved

- [x] The Admin can activate the current device as a Kiosk with a name; the Kiosk page then works on that device, even after logging out of the admin area
- [x] The device token is stored only as a hash
- [x] Several Kiosks can be active at once
- [x] The Admin sees all Kiosks with their activation date and revoked state
- [x] Revoking a Kiosk makes that device see "this device is not a Kiosk" on its next request
- [x] A browser that was never activated sees "this device is not a Kiosk"
- [x] Attendance-module tests cover activation, resolving a token, an unknown token and a revoked token

## Comments

**2026-11-27 (agent):** Implemented. Lint, typecheck, Vitest (10 new Kiosk tests against PGlite) and the build pass, and so does Playwright: 4 new tests in `e2e/kiosks.spec.ts` plus the existing 5, against the production build on a PGlite server. Not verified: the Secure cookie over real HTTPS behind Tailscale Serve, because CI and local runs are plain `http://localhost`.

What later tickets need to know:

- **Resolving the Kiosk.** `currentKiosk()` from `src/server/kiosk-device.ts` returns the `Kiosk` (`{ id, name, activatedAt }`) or `null` when the device has no cookie, an unknown token or a revoked Kiosk. It looks the token up in the database on every request, is wrapped in React `cache`, and needs no Admin session. Kiosk pages call it inside their `<Suspense>` child (reading the cookie is the suspension point, so no `connection()` is needed) and render "This device is not a Kiosk" for null, as `src/app/kiosk/page.tsx` does. Kiosk Server Actions call it as the first line and refuse for null. Unlike `requireAdmin()`, it doesn't redirect. Pass `kiosk.id` to `tap` and `undo` for "only from the Kiosk that made the tap".
- **The Kiosk page** is `/kiosk`. For now it shows a "Clock in or out" heading with the Kiosk's name, and ticket 05 adds the name list where the comment says. The not-a-Kiosk screen's heading is "This device is not a Kiosk".
- **The Attendance module** gained `activateKiosk({ name, now })` (returns `{ ok: true, kiosk, token }` or `{ ok: false, error: "missing-name" }`; the name is trimmed), `resolveKiosk(token)`, `listKiosks()` (newest first, with `revokedAt`) and `revokeKiosk({ kioskId, now })` (idempotent; it keeps the first revoked time). They live in `src/attendance/kiosks.ts` and are spread into `createAttendance`, so `index.ts` barely changed. The token is 32 random bytes (base64url), stored as a SHA-256 hex hash in `kiosk.token_hash` (unique). A fast hash is enough because the token has 256 bits of entropy. Migration `0002_kiosk`.
- **The cookie** is `kiosk_device`: HTTP-only, `SameSite=Lax`, `path=/`, a 400-day max age (the browsers' cap), and Secure only when `BETTER_AUTH_URL` is `https://` (built by `kioskCookie()` in `src/server/kiosk-cookie.ts`). `src/proxy.ts` now also matches `/kiosk/:path*` and sets the cookie again with a fresh expiry on every Kiosk request, page loads, `router.refresh()` and Server Action POSTs included, so a Kiosk in use never hits the cap. It doesn't check the token there, and the `/admin` redirect is unchanged.
- **Admin page** `/admin/kiosks`: if this device isn't a Kiosk, it shows a form to activate it with a name, which then redirects to `/kiosk`. If it is one, it links to `/kiosk` instead, and activating again is refused until the Admin revokes it, so a device never leaves an orphaned active Kiosk behind. Below that is every Kiosk with its activation date, revoked date and a Revoke button. Revoking this device's own Kiosk also deletes its cookie. Revoke is one click, with no confirmation.
- **Admin navigation**: `src/app/admin/layout.tsx` has a `<nav>` with one `<Link>` per line ("On site now", "Kiosks"). Ticket 03 can add "Employees" as one more line.

