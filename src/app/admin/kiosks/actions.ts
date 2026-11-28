"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/admin-session";
import { getServer } from "@/server/attendance";
import {
  clearKioskCookie,
  currentKiosk,
  setKioskCookie,
} from "@/server/kiosk-device";

export type ActivateKioskState = { name: string; error?: string };

/** Activates the device the Admin is using as a new Kiosk, then opens the Kiosk on it. */
export async function activateThisDevice(
  _previous: ActivateKioskState,
  formData: FormData,
): Promise<ActivateKioskState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "");

  const existing = await currentKiosk();
  if (existing) {
    return {
      name,
      error: `This device is already the Kiosk “${existing.name}”. Revoke it first.`,
    };
  }

  const result = await getServer().attendance.activateKiosk({
    name,
    now: new Date(),
  });
  if (!result.ok) {
    return { name, error: "Give the Kiosk a name." };
  }
  await setKioskCookie(result.token);
  redirect("/kiosk");
}

/** Revokes a Kiosk. Its device stops working on its next request. */
export async function revokeKiosk(kioskId: string) {
  await requireAdmin();
  const thisDevice = await currentKiosk();

  await getServer().attendance.revokeKiosk({ kioskId, now: new Date() });

  if (thisDevice?.id === kioskId) {
    await clearKioskCookie();
  }
  refresh();
}
