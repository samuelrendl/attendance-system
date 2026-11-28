import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { readConfig } from "./server/config";
import { KIOSK_COOKIE, kioskCookie } from "./server/kiosk-cookie";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/kiosk" || pathname.startsWith("/kiosk/")) {
    return refreshKioskCookie(request);
  }
  return requireSessionCookie(request);
}

/**
 * Fast path only: sends a visitor with no session cookie at all straight to
 * the login page. It doesn't check the cookie is valid. Every admin page and
 * Server Action still calls `requireAdmin()` (src/server/admin-session.ts).
 */
function requireSessionCookie(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

/**
 * Sets the Kiosk cookie again with a fresh expiry, so a Kiosk in use outlives
 * the browsers' ~400-day cap on cookie lifetimes. It doesn't check the token:
 * `currentKiosk()` (src/server/kiosk-device.ts) does that on every request.
 */
function refreshKioskCookie(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(KIOSK_COOKIE)?.value;
  if (token) {
    response.cookies.set(kioskCookie(token, readConfig().authUrl));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/kiosk/:path*"],
};
