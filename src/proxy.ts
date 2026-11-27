import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast path only: sends a visitor with no session cookie at all straight to
 * the login page. It doesn't check the cookie is valid. Every admin page and
 * Server Action still calls `requireAdmin()` (src/server/admin-session.ts).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
