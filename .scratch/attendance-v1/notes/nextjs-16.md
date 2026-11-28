# Next.js 16.4.6 notes for the attendance-v1 tickets

All doc paths are relative to `d:/Documents/projects/attendance-system/node_modules/next/dist/docs/01-app/` unless absolute. "Verified in source" means I read `node_modules/next/dist/**`.

## 0. This repo's config changes everything: Cache Components is ON

`next.config.ts` sets `cacheComponents: true` and `partialPrefetching: true`. Consequences (`03-api-reference/05-config/01-next-config-js/cacheComponents.md`, `01-getting-started/08-caching.md`, `02-guides/migrating-to-cache-components.md`):

- Nothing is cached unless you write `"use cache"`. Data fetching is dynamic by default.
- BUT anything that can finish during the build prerender is baked into a static shell at build time. Synchronous code counts as "predictable": module imports, pure computation, sync I/O, and `process.env` reads (`08-caching.md` "Predictable values"). So a component that only reads `process.env` or `readConfig()` gets PRERENDERED with build-time env. This is why `src/app/admin/page.tsx` calls `await connection()` before `getServer()`.
- `new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()` during prerender are a build error unless preceded by `await connection()` / `await io()` inside `<Suspense>`, or inside `"use cache"`. `instant = false` does NOT clear these (`migrating-to-cache-components.md` l.84, l.101). Relevant for "now"-based pages (Register, Timesheet, On site now).
- Dynamic work (`cookies()`, `headers()`, `connection()`, uncached DB awaits) must sit under a `<Suspense>` boundary (or `loading.tsx`) or the build fails with a "blocking route" error (`02-guides/streaming.md` l.380; `02-guides/authentication-with-cache-components.md` Step 2: "reading `cookies()` outside a boundary is a build error").
- Route segment config `export const dynamic`, `revalidate`, `fetchCache`, `dynamicParams` ERROR with Cache Components. Do NOT write `export const dynamic = 'force-dynamic'` (`migrating-to-cache-components.md` l.70, l.136; `03-file-conventions/02-route-segment-config/index.md` version table). `export const runtime` is also unsupported (`cacheComponents.md` Good to know). Some older-looking docs still show `force-static` on route handlers (`01-getting-started/15-route-handlers.md` "Caching"): that is the non-Cache-Components model, ignore it.
- New segment configs that exist only with Cache Components: `instant` (dev-only navigation validation; `false` = allowed to block) and `ensureStatic` (`'auto'|'shell'|'prefetch'|'navigation'|false`, v16.4.0). Leave `ensureStatic` unset; `'navigation'` would forbid DB/cookies entirely (`02-route-segment-config/ensureStatic.md`).
- Client state is preserved across navigations with React `<Activity>` (hidden routes stay mounted, effects cleaned up). See section 8.

### How to keep a page dynamic (recipe)

```tsx
// page.tsx (Server Component), pattern already used in src/app/admin/page.tsx
import { connection } from "next/server";
import { Suspense } from "react";

export default function Page() {
  return (
    <main>
      <h1>Static heading (prerendered)</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Data />
      </Suspense>
    </main>
  );
}

async function Data() {
  await connection();          // or: await cookies() / await headers(); either is a suspension point
  const { attendance } = getServer(); // readConfig() now runs at request time
  const now = new Date();      // safe after connection()
  ...
}
```

- `connection()` from `next/server`: "rendering should wait for an incoming user request" (`03-api-reference/04-functions/connection.md`). Replaces `unstable_noStore`.
- `io()` from `next/cache` (v16.3.0) is the docs' preferred variant: same effect outside cache scopes, but is a no-op inside `"use cache"` instead of throwing (`03-api-reference/04-functions/io.md`). `connection()` docs: "prefer `io()` ... reach for `connection()` only when rendering should wait for a real user request." Either works; reading env config is the "real request" case, so `connection()` is fine and matches existing code.
- You don't need `connection()` if the component already awaits `cookies()`/`headers()` (`io.md` "When you don't need io()"). An auth check that reads cookies is itself the suspension point, BUT it does not make module-scope code dynamic: never call `readConfig()`/`getServer()`/`betterAuth({...env})` at module top level.
- Env docs say the same: read runtime env after `await connection()` (`02-guides/environment-variables.md` ~l.206; `02-guides/self-hosting.md` "Environment Variables"). `serverRuntimeConfig`/`publicRuntimeConfig` are removed in 16 (`02-guides/upgrading/version-16.md` "Runtime Configuration"). `NEXT_PUBLIC_*` is inlined at build: don't use it for runtime config.
- `"use cache"` cannot call `cookies()`/`headers()` (throws). `"use cache: private"` can, but caches only in the browser and does not accept `connection()` (`authentication-with-cache-components.md`). For this app: just don't cache; everything is per-request.
- Accidental-static traps: (1) a page whose only work is sync (`readConfig()`, `process.env`, formatting) gets prerendered; (2) a Client Component that reads `Date.now()` during render is SSR-prerendered too, needs `use(io())` (`io.md`); (3) a `GET` route handler that doesn't touch the request/DB is prerendered at build (`15-route-handlers.md` "With Cache Components").

## 1. Protecting a route group: `proxy.ts` (middleware is deprecated)

- `middleware.ts` is deprecated and renamed `proxy.ts`; export `proxy` (named or default). Same features. Codemod `npx @next/codemod@canary middleware-to-proxy .` (`03-api-reference/03-file-conventions/middleware.md`, `01-getting-started/16-proxy.md`, `02-guides/upgrading/version-16.md` "`middleware` to `proxy`"). Config flags renamed too, e.g. `skipProxyUrlNormalize`.
- Location: project root or `src/` (same level as `app`), so here `src/proxy.ts`. Only one per project.
- Runtime: Node.js, always. "The `runtime` config option is not available in Proxy files. Setting the `runtime` config option in Proxy will throw" (`03-file-conventions/proxy.md` "Runtime", l.257; v16.0.0 history row). Edge is NOT supported in proxy.
- `"use cache"`/`"use server"` do nothing in proxy (`16-proxy.md` Limitations).
- Docs' advice (`02-guides/authentication.md` "Optimistic checks with Proxy (Optional)", "Layouts and auth checks"):
  - Proxy is optional, for OPTIMISTIC checks only: read the session cookie, redirect; no DB lookups ("runs on every route, including prefetched routes").
  - "should not be used as a full session management or authorization solution" (`16-proxy.md`).
  - Layout checks are discouraged: layouts don't re-render on client navigation (Partial Rendering), and a layout doesn't stop child segments, parallel slots or Server Actions from running. `return null` in a layout "is not recommended".
  - Do the secure check in a Data Access Layer (`verifySession()` with React `cache`) called from pages/leaf components AND inside every Server Action and Route Handler. `React.cache` does nothing in actions/route handlers (no render pass), so each call runs.
  - Server Actions are separate POSTs to the page route; a proxy matcher that excludes a path also skips its actions (`proxy.md` "Execution order" Good to know). Always re-check auth inside actions.
- Matcher: without one, proxy runs on everything incl. `_next/static`; use a negative matcher (`proxy.md` "Matcher"):

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const has = request.cookies.has("<session-cookie-name>"); // optimistic only
  if (!has && request.nextUrl.pathname.startsWith("/admin") ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
```

  Better Auth has a helper for reading its session cookie in proxy (`getSessionCookie` from `better-auth/cookies`, from my pre-cutoff knowledge; better-auth is NOT installed in this worktree, so verify in ticket 02's worktree).
- Proxy can SET response cookies: `const res = NextResponse.next(); res.cookies.set({...}); return res;` (`proxy.md` "Using Cookies"). Possible place to refresh a long-lived Kiosk cookie's expiry (see section 3).
- Route groups: `(folderName)` is not in the URL (`03-file-conventions/route-groups.md`). A group doesn't protect anything by itself; the auth check still lives in the DAL.
- With Cache Components, put the session read in a Suspense'd component, not as a top-level `await` in a layout (that blocks `{children}`) (`authentication-with-cache-components.md` Step 2; `authentication.md` "Auth and streaming"). `redirect()` inside a streamed child still works: "When used in a streaming context, this will insert a meta tag to emit the redirect on the client side" (`04-functions/redirect.md`). Proxy is the way to get a real 307 before rendering.
- `unauthorized()`/`forbidden()` + `unauthorized.tsx` need experimental `authInterrupts` (`02-guides/server-actions.md` Security). Not needed; `redirect('/login')` is fine.

## 2. Server Actions and forms

Sources: `01-getting-started/07-mutating-data.md`, `02-guides/forms.md`, `02-guides/server-actions.md`, `02-guides/authentication.md` (signup example).

- Define with `"use server"` at file top (needed for import into Client Components) or inline in a Server Component. Client Components can't define actions, only import them.
- With `useActionState` the action signature gains a first `prevState` arg:

```ts
// actions.ts
"use server";
export type FormState = { errors?: { name?: string[] }; message?: string } | undefined;
export async function createEmployee(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();                         // auth inside EVERY action
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { errors: { name: ["Name is required"] } };
  await attendance.addEmployee(...);
  revalidatePath("/admin/employees");          // or refresh(); see below
  redirect("/admin/employees");                // throws; call outside try/catch, after revalidate
}
```

```tsx
"use client";
import { useActionState } from "react";
const [state, formAction, pending] = useActionState(createEmployee, undefined);
<form action={formAction}> ... {state?.errors?.name && <p aria-live="polite">{state.errors.name}</p>}
<button disabled={pending}>Save</button></form>
```

- Extra args: `action.bind(null, id)` → `async function update(id: string, prev, formData)` (`forms.md` "Passing additional arguments"). Works with progressive enhancement. Hidden inputs also work but are not encoded.
- Zod is not installed. The docs' examples use Zod v4 syntax (`z.email({ error })`, `.flatten().fieldErrors`) (`authentication.md` l.101+). Hand validation is fine too; domain rules belong in the Attendance module anyway (spec).
- Pending: `useActionState`'s third value, or `useFormStatus` from `react-dom` in a child.
- `redirect(path)` (`next/navigation`): throws `NEXT_REDIRECT`; call outside `try`. Defaults to `push` in actions, `replace` elsewhere. Progressive-enhancement form posts get a 303 (`04-functions/redirect.md`). `redirect` can't be called from client event handlers; use `useRouter`.
- Which refresh after a mutation (`server-actions.md` "Choosing a cache update"):
  - `refresh()` from `next/cache` (new in 16): re-renders the current route's RSC payload without invalidating caches. Server Actions ONLY (throws in route handlers) (`04-functions/refresh.md`). Best fit here, since we cache nothing.
  - `revalidatePath(path, type?)`: works in actions and route handlers. In an action it updates the UI immediately and "currently also causes all previously visited pages to refresh when navigated to again" (`04-functions/revalidatePath.md`). With route groups: `revalidatePath('/(admin)/x', 'page')` form exists. `revalidatePath('/', 'layout')` purges everything.
  - `updateTag(tag)`: read-your-writes for `cacheTag`ged data; actions only. `revalidateTag(tag, profile)` now REQUIRES a second arg (single-arg form deprecated, TS error) and does NOT re-render in the action response (`upgrading/version-16.md` "Caching APIs").
  - Setting/deleting a cookie in an action also re-renders the current page in the same response (`07-mutating-data.md` "Cookies").
  - One response carries return value + new RSC payload; no follow-up fetch needed (`server-actions.md` "A single response carries data and UI").
- Client dispatches actions ONE AT A TIME per client (`server-actions.md` "Sequential dispatch"). Two quick taps on the Kiosk queue, they don't run in parallel.
- Security: actions are public POST endpoints. CSRF check compares `Origin` host to `x-forwarded-host`/`host`; mismatch is rejected. Extra hosts via `experimental.serverActions.allowedOrigins` (it is under `experimental` in this version: `05-config/01-next-config-js/serverActions.md`; `server/config-shared.d.ts` l.2051). Body limit 1MB default.
- Deployment: action IDs change between builds; an old tab calling a removed ID gets "Failed to find Server Action". Show a retry/reload path (`server-actions.md` "Deployment considerations"). `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` matters only for multi-instance; single Pi container is fine.
- After a successful submit with Activity, the form's state/messages persist if the user navigates away and back; reset in the handler or with a callback ref `ref={(f) => () => f?.reset()}` (`02-guides/preserving-ui-state.md` "Forms, inputs, and state").

## 3. `cookies()` / `headers()` and the long-lived Kiosk cookie

- Both are ASYNC and sync access is fully removed in 16 (`02-guides/upgrading/version-16.md` "Async Request APIs (Breaking change)"). Also async: `params`, `searchParams`, `draftMode`. Use `await cookies()`, `await headers()`, `await params`.
- `headers()` is read-only (`04-functions/headers.md`).
- `cookies().set/delete` only in Server Functions or Route Handlers (or proxy via `NextResponse`), never during Server Component render ("HTTP does not allow setting cookies after streaming starts") (`04-functions/cookies.md`).
- Options: `name, value, expires (Date), maxAge (seconds), domain, path (default '/'), secure, httpOnly, sameSite ('lax'|'strict'|'none'|boolean), priority, partitioned`. Only `path` has a default.
- With Cache Components, `cookies()`/`headers()` outside `<Suspense>` blocks prerender (build error); inside, only that subtree is dynamic.

```ts
// activateKiosk action (ticket 04)
"use server";
import { cookies } from "next/headers";
export async function activateKiosk(prev: State, formData: FormData) {
  await requireAdmin();
  const { token } = await attendance.activateKiosk(name);   // store only the hash
  (await cookies()).set("kiosk_token", token, {
    httpOnly: true,
    secure: true,          // see red flag below
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,   // browsers cap at 400 days (Chrome); re-set periodically
  });
  redirect("/kiosk");
}
```

- Red flags: `secure: true` cookies are dropped on plain-HTTP origins other than `localhost`. Prod is HTTPS via Tailscale Serve (spec "Access"), fine. CI E2E "against the app running under Compose" must hit `http://localhost:...`, not a compose service hostname like `http://app:3000`, or the cookie silently won't stick. Browsers cap cookie lifetime at ~400 days, so "stays activated across days" needs the expiry refreshed (e.g. re-set in a Kiosk Server Action on each tap, or in `proxy.ts` via `response.cookies.set`).
- Deleting: `.delete(name)`, or `set(name, '')`, or `maxAge: 0`; must match domain/protocol of the set.

## 4. Route handlers (Better Auth catch-all)

Sources: `01-getting-started/15-route-handlers.md`, `03-file-conventions/route.md`.

- `app/**/route.ts` exporting `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS`. No `route.ts` in the same segment as a `page.tsx`.
- Catch-all: `src/app/api/auth/[...all]/route.ts`; `context.params` is a Promise: `Promise<{ all: string[] }>` (`route.md` l.103). Typed helper `RouteContext<'/api/auth/[...all]'>` (generated by `next typegen`, which `pnpm typecheck` runs).
- Better Auth's documented wiring (pre-cutoff knowledge, verify against installed version): `export const { GET, POST } = toNextJsHandler(auth)` from `better-auth/next-js`.
- With Cache Components, GET handlers that read the request are dynamic. One that doesn't is prerendered at build. `use cache` can't go directly in a handler body.
- Treat handlers like public endpoints; re-verify auth (`authentication.md` "Route Handlers").
- Don't build the `auth` instance at module scope from env: route modules are evaluated during `next build` (page data collection), so a module-level `readConfig()` throws or bakes build-time values. Use a lazy `getAuth()` singleton like `getServer()` in `src/server/attendance.ts`.
- `pg` is on Next's built-in `serverExternalPackages` list, as are `argon2`, `bcrypt`, `@node-rs/argon2`, `@node-rs/bcrypt` (`05-config/01-next-config-js/serverExternalPackages.md` l.32-75), so no config is needed for PIN hashing libs.

## 5. `instrumentation.ts` `register()` (seed the Admin?)

Sources: `03-file-conventions/instrumentation.md`, `02-guides/instrumentation.md`; verified in source.

- File: `src/instrumentation.ts` (inside `src/` since the app uses it, not inside `app/`).
- `export async function register()` "is called **once** when a new Next.js server instance is initiated, and must complete before the server is ready to handle requests." Can be async.
- Runs in every runtime: guard Node-only code and import it dynamically inside `register`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedAdmin } = await import("./server/seed-admin");
    await seedAdmin();   // idempotent: create only if no Admin exists
  }
}
```

- Source check: invoked from `NextNodeServer.loadInstrumentationModule()` (`node_modules/next/dist/server/next-server.js` l.562-581) and lazily from `RouteModule.ensureInstrumentation()` before a request's handler (`dist/server/route-modules/route-module.js` l.428-452). I found no call in the build/export workers (`dist/build/index.js` only detects/copies the file into standalone output), so it should not run during `next build`. Not stated in the docs, so confirm with a log line.
- Consequences: if `register` throws (DB down, migration not run), the server fails to become ready. Compose's migrate-before-app ordering (spec) covers this. Also runs on `next dev` start and in Playwright's webServer. Make it idempotent and safe to run concurrently.
- `onRequestError(err, request, context)` export also exists if you want server error logging.
- `02-guides/self-hosting.md` "Environment Variables" explicitly suggests `register` for server-startup code.

## 6. `output: "standalone"` for Docker

Sources: `05-config/01-next-config-js/output.md`, `02-guides/self-hosting.md`, `01-getting-started/17-deploying.md`.

- `output: "standalone"` in `next.config.ts` → `.next/standalone/` with traced `node_modules` and a minimal `server.js`. Run `node server.js`. `PORT` and `HOSTNAME` env vars (`HOSTNAME=0.0.0.0` in Docker).
- `public/` and `.next/static/` are NOT copied: `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`.
- `next.config` is serialized into the output at build time. Runtime env is still read at request time if you follow section 0.
- Missing-file fixes: `outputFileTracingIncludes` / `outputFileTracingExcludes` (keys = route globs, values = globs from project root). The admin reset-password CLI script (ticket 02) and drizzle migrations are not traced by a page, so copy them explicitly in the Dockerfile or add them via `outputFileTracingIncludes`.
- `instrumentation.ts` is included in standalone automatically (`dist/build/index.js` l.1136).
- Windows: standalone generation may need symlink privileges (dev only; CI/Pi are Linux).
- Official example: `https://github.com/vercel/next.js/tree/canary/examples/with-docker` (`17-deploying.md` l.52).
- Self-hosting: streaming needs the proxy not to buffer (Tailscale Serve: verify the static shell streams). Dynamic pages get `Cache-Control: private, no-cache, no-store`. Cache Components works with `next start`/Docker. Graceful shutdown on SIGTERM drains in-flight requests (`self-hosting.md`).
- Version skew: a kiosk tab left open across a release keeps old JS and action IDs. A `deploymentId` triggers a hard reload on mismatch for navigations (`self-hosting.md` "Version Skew"). For a single-instance kiosk, consider forcing a reload when an action fails with "Failed to find Server Action".

## 7. Live "now": client polling with `router.refresh()`

- `useRouter` from `next/navigation`. `router.refresh()` re-requests the current route, re-renders Server Components and merges the payload, preserving client state and scroll. It clears the client cache for that route but does NOT touch server caches (irrelevant here: nothing is cached) (`04-functions/use-router.md`).
- Minimal poller (place it in the page, inside the dynamic section or alongside it):

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export function AutoRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);   // with Activity, cleanup also runs when the route is hidden, so polling pauses off-screen
  }, [router, everyMs]);
  return null;
}
```

  Effect cleanup on Activity hide: `02-guides/preserving-ui-state.md` "Effect and media cleanup".
- The docs point at SWR/TanStack for focus revalidation and interval polling with a shared cache (`02-guides/single-page-applications.md` l.47, `client-side-data-fetching/index.md`). Overkill here; `router.refresh()` is enough.
- For a ticking clock rendered on the client, `Date.now()` during render needs `use(io())` from `next/cache` under Cache Components, or compute in an effect (`io.md`).
- Time zone: format with `Intl.DateTimeFormat(..., { timeZone: workplaceTimeZone })` on the server (as `admin/page.tsx` does). A client-side clock must be passed the zone; never read it from the browser.

## 8. Activity (Cache Components) gotchas for Kiosk and E2E

`02-guides/preserving-ui-state.md`, `cacheComponents.md` "Navigation with Activity":

- Hidden routes stay in the DOM with `display: none`. In Playwright, prefer `getByRole` (excludes hidden). `getByLabel`/`locator()` can match hidden copies, so add `.filter({ visible: true })`. Strict-mode violations are the symptom.
- Kiosk: after a PIN step navigates back to the picker, the old PIN input or state may still be there. Reset explicitly (event handler or `useLayoutEffect` cleanup) or key by something.
- Logout: use `window.location.href = '/login'` (full reload) to drop client state, per the docs' "State and authentication" section.

## 9. Misc facts

- `typegen`: `next typegen` generates `PageProps<'/route'>`, `LayoutProps`, `RouteContext` global helpers (`upgrading/version-16.md` l.273). Already part of `pnpm typecheck`.
- `next lint` is removed; ESLint flat config (repo already uses `eslint`).
- Turbopack is the default for dev and build.
- `cacheLife`/`cacheTag` lost the `unstable_` prefix.
- Version 16 requires React 19.2+; repo has React 19.3.0.

## 10. Deprecation / removal checklist

| Thing | Status | Source |
|---|---|---|
| `middleware.ts` / `export function middleware` | Deprecated → `proxy.ts` / `proxy` | `03-file-conventions/middleware.md` |
| Edge runtime in proxy | Not supported; proxy is nodejs-only, `runtime` export throws | `proxy.md` l.257; `version-16.md` |
| `skipMiddlewareUrlNormalize` | Renamed `skipProxyUrlNormalize` | `version-16.md` |
| Sync `cookies()`/`headers()`/`params`/`searchParams` | Removed | `version-16.md` "Async Request APIs" |
| `export const dynamic/revalidate/fetchCache/dynamicParams` | Error with Cache Components | `migrating-to-cache-components.md` |
| `export const runtime` (any value) | Unsupported with Cache Components; `'edge'` deprecated | `cacheComponents.md`; segment config index |
| `experimental_ppr`, `experimental.ppr`, `experimental.dynamicIO`, `experimental.useCache` | Removed (replaced by `cacheComponents`) | `cacheComponents.md` |
| `unstable_noStore` | Replaced by `connection()` (or `io()`) | `connection.md` |
| `unstable_instant` | Now `instant` (v16.3) | `instant.md` |
| `revalidateTag(tag)` single arg | Deprecated; use `revalidateTag(tag, 'max')` or `updateTag` | `version-16.md` |
| `unstable_cacheLife`/`unstable_cacheTag` | Now `cacheLife`/`cacheTag` | `version-16.md` |
| `serverRuntimeConfig`/`publicRuntimeConfig` | Removed; use env + `connection()` | `version-16.md` |
| `next lint` | Removed | `version-16.md` |
| `partialPrefetching` unset | Logs a warning; repo sets it | `cacheComponents.md` |
