import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Admin } from "@/auth";
import { getServer } from "./attendance";

/**
 * The Admin session check. Every admin page and every admin Server Action (and
 * route handler) calls it before touching data. Never rely on a layout for it.
 *
 * In a page, inside the `<Suspense>` boundary that renders the data:
 *
 *     async function OnSiteNow() {
 *       await connection();
 *       const admin = await requireAdmin();
 *       ...
 *     }
 *
 * In a Server Action (a "use server" file), as the first line:
 *
 *     export async function renameEmployee(...) {
 *       const admin = await requireAdmin();
 *       ...
 *     }
 *
 * Returns the logged-in Admin, or redirects to the login page when there is
 * no valid Admin session. The proxy's cookie check is only a fast path; this
 * is the check that counts, because it looks the session up in the database.
 */
export const requireAdmin = cache(async (): Promise<Admin> => {
  // Read the request first: that's what keeps this out of the prerender.
  const requestHeaders = await headers();
  const admin = await getServer().adminAuth.getAdmin(requestHeaders);
  if (!admin) {
    redirect("/login");
  }
  return admin;
});
