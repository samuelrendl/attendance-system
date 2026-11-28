import { cookies } from "next/headers";
import { cache } from "react";
import type { Kiosk } from "@/attendance";
import { getServer } from "./attendance";
import { KIOSK_COOKIE, kioskCookie } from "./kiosk-cookie";

/**
 * The Kiosk this device is, from its device token cookie, or null when the
 * device isn't an activated Kiosk (no cookie, an unknown token, or a revoked
 * Kiosk). It looks the token up on every request, so a revoked Kiosk stops
 * working at once. It never needs an Admin session.
 *
 * Every Kiosk page calls it inside the `<Suspense>` boundary that renders the
 * Kiosk, and shows "This device is not a Kiosk" for null:
 *
 *     async function KioskScreen() {
 *       const kiosk = await currentKiosk();
 *       if (!kiosk) return <NotAKiosk />;
 *       ...
 *     }
 *
 * Every Kiosk Server Action calls it as the first line, and refuses for null:
 *
 *     export async function tap(...) {
 *       const kiosk = await currentKiosk();
 *       if (!kiosk) return { error: "not-a-kiosk" };
 *       ...
 *     }
 */
export const currentKiosk = cache(async (): Promise<Kiosk | null> => {
  // Read the request first: that's what keeps this out of the prerender.
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return getServer().attendance.resolveKiosk(token);
});

/** Makes this device the Kiosk with this device token. Server Actions only. */
export async function setKioskCookie(token: string) {
  (await cookies()).set(kioskCookie(token, getServer().config.authUrl));
}

/** Forgets this device's Kiosk device token, if any. Server Actions only. */
export async function clearKioskCookie() {
  (await cookies()).delete(KIOSK_COOKIE);
}
