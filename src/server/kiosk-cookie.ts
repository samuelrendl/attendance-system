/** The cookie that holds a Kiosk's device token. */
export const KIOSK_COOKIE = "kiosk_device";

/**
 * Browsers cap a cookie's lifetime at about 400 days (Chrome enforces it), so
 * a longer one would be cut short anyway. `src/proxy.ts` sets the cookie again
 * on every Kiosk request, so an activated Kiosk in daily use never expires.
 */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * The Kiosk cookie carrying this device token: HTTP-only, long-lived, and
 * Secure when the app is served over HTTPS (as on the Pi, behind Tailscale
 * Serve). Over plain HTTP, as in local runs and CI, a Secure cookie would be
 * dropped by the browser on any host but localhost.
 *
 * Works with both `(await cookies()).set(...)` and `response.cookies.set(...)`.
 */
export function kioskCookie(token: string, appUrl: string) {
  return {
    name: KIOSK_COOKIE,
    value: token,
    httpOnly: true,
    secure: new URL(appUrl).protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
