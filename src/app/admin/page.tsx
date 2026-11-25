import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getServer } from "@/server/attendance";

export const metadata: Metadata = {
  title: "On site now · Attendance",
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="font-heading text-2xl font-semibold">On site now</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <OnSiteNow />
      </Suspense>
    </main>
  );
}

async function OnSiteNow() {
  await connection();
  const { attendance, workplaceTimeZone } = getServer();
  const onSite = await attendance.onSiteNow(new Date());

  if (onSite.length === 0) {
    return <p className="text-muted-foreground">Nobody is on site.</p>;
  }

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: workplaceTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ul className="divide-y rounded-lg border">
      {onSite.map((employee) => (
        <li
          key={employee.employeeId}
          className="flex items-center justify-between px-4 py-3"
        >
          <span className="font-medium">{employee.name}</span>
          <span className="text-muted-foreground tabular-nums">
            Clocked in {time.format(employee.clockIn)}
          </span>
        </li>
      ))}
    </ul>
  );
}
