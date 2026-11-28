import { createTestDatabase } from "../attendance/testing";
import { createAdminAuth } from "./index";

/**
 * Admin access backed by a fresh test database. Call it inside a test: the
 * database is closed when that test finishes.
 */
export async function createTestAdminAuth() {
  return createAdminAuth({
    db: await createTestDatabase(),
    secret: "a-test-secret-that-is-at-least-32-characters",
    baseURL: "http://localhost:3000",
  });
}

/** Turns a response's Set-Cookie headers into the Cookie header a browser would send back. */
export function cookiesFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((setCookie) => setCookie.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}
