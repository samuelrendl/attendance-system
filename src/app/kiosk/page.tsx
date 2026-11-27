import type { Metadata } from "next";
import { Suspense } from "react";
import { getServer } from "@/server/attendance";
import { currentKiosk } from "@/server/kiosk-device";
import { KioskTap } from "./kiosk-tap";

export const metadata: Metadata = {
  title: "Kiosk · Attendance",
};

// No Admin session needed: the device's Kiosk cookie is what counts.
export default function KioskPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <KioskScreen />
      </Suspense>
    </main>
  );
}

async function KioskScreen() {
  const kiosk = await currentKiosk();
  if (!kiosk) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h1 className="font-heading text-2xl font-semibold">
          This device is not a Kiosk
        </h1>
        <p className="text-muted-foreground">
          The Admin can activate it as a Kiosk from the admin area.
        </p>
      </div>
    );
  }

  // Reading the cookie above made this request-time, so `new Date()` is safe here.
  const employees = await getServer().attendance.listKioskEmployees(new Date());

  return (
    <>
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Clock in or out</h1>
        <span className="text-sm text-muted-foreground">{kiosk.name}</span>
      </header>
      <KioskTap employees={employees} />
    </>
  );
}
