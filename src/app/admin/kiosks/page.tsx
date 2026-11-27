import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/admin-session";
import { getServer } from "@/server/attendance";
import { currentKiosk } from "@/server/kiosk-device";
import { revokeKiosk } from "./actions";
import { ActivateForm } from "./activate-form";

export const metadata: Metadata = {
  title: "Kiosks · Attendance",
};

export default function KiosksPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <h1 className="font-heading text-2xl font-semibold">Kiosks</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Kiosks />
      </Suspense>
    </main>
  );
}

async function Kiosks() {
  await connection();
  await requireAdmin();
  const { attendance, workplaceTimeZone } = getServer();
  const [kiosks, thisDevice] = await Promise.all([
    attendance.listKiosks(),
    currentKiosk(),
  ]);

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: workplaceTimeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">This device</h2>
        {thisDevice ? (
          <p>
            This device is the Kiosk “{thisDevice.name}”.{" "}
            <Link href="/kiosk" className="underline underline-offset-4">
              Open the Kiosk
            </Link>
          </p>
        ) : (
          <>
            <p className="text-muted-foreground">
              Make this device a Kiosk, so Employees can clock in and out on
              it. It stays a Kiosk after you log out, until you revoke it.
            </p>
            <ActivateForm />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">All Kiosks</h2>
        {kiosks.length === 0 ? (
          <p className="text-muted-foreground">No Kiosks yet.</p>
        ) : (
          <ul aria-label="Kiosks" className="divide-y rounded-lg border">
            {kiosks.map((kiosk) => (
              <li
                key={kiosk.id}
                aria-label={kiosk.name}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {kiosk.name}
                    {kiosk.id === thisDevice?.id && (
                      <span className="text-muted-foreground"> (this device)</span>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Activated {date.format(kiosk.activatedAt)}
                    {kiosk.revokedAt &&
                      ` · Revoked ${date.format(kiosk.revokedAt)}`}
                  </span>
                </div>
                {kiosk.revokedAt ? (
                  <span className="text-sm text-muted-foreground">Revoked</span>
                ) : (
                  <form action={revokeKiosk.bind(null, kiosk.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Revoke
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
