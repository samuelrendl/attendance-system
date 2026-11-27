"use server";

import { headers } from "next/headers";
import { getServer } from "@/server/attendance";

/** Ends the Admin session. The caller then reloads to the login page. */
export async function logOut() {
  const requestHeaders = await headers();
  await getServer().adminAuth.logOut(requestHeaders);
}
