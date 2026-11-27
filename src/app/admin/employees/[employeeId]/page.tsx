import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/server/admin-session";
import { getServer } from "@/server/attendance";
import {
  DeactivationForm,
  RenameEmployeeForm,
  SetPinForm,
} from "../employee-forms";
import { EmployeeStatus } from "../employee-status";

export const metadata: Metadata = {
  title: "Employee · Attendance",
};

export default function EmployeePage({
  params,
}: PageProps<"/admin/employees/[employeeId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <Link
        href="/admin/employees"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← All Employees
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Employee params={params} />
      </Suspense>
    </main>
  );
}

async function Employee({
  params,
}: {
  params: PageProps<"/admin/employees/[employeeId]">["params"];
}) {
  await connection();
  await requireAdmin();
  const { employeeId } = await params;
  const employee = await getServer().attendance.findEmployee(employeeId);
  if (!employee) {
    notFound();
  }
  const { deactivatedAt } = employee;
  const deactivated = deactivatedAt !== null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold">{employee.name}</h1>
        <EmployeeStatus deactivated={deactivated} />
      </div>

      <section aria-labelledby="rename" className="flex flex-col gap-4">
        <h2 id="rename" className="font-heading text-lg font-medium">
          Rename
        </h2>
        <RenameEmployeeForm employeeId={employee.id} name={employee.name} />
      </section>

      <section aria-labelledby="pin" className="flex flex-col gap-4">
        <h2 id="pin" className="font-heading text-lg font-medium">
          PIN
        </h2>
        <p className="text-sm text-muted-foreground">
          PINs are stored scrambled, so the current one can&apos;t be shown. Set
          a new one if it&apos;s been forgotten.
        </p>
        <div className="max-w-40">
          <SetPinForm employeeId={employee.id} />
        </div>
      </section>

      <section aria-labelledby="deactivation" className="flex flex-col gap-4">
        <h2 id="deactivation" className="font-heading text-lg font-medium">
          {deactivated ? "Deactivated" : "Deactivate"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {deactivatedAt
            ? `Deactivated on ${formatDate(deactivatedAt, getServer().workplaceTimeZone)}. ` +
              "They don't appear on the Kiosk. Reactivate them if they come back; their Time entries are kept."
            : "Deactivate an Employee who has left. They disappear from the Kiosk, and their Time entries are kept."}
        </p>
        <DeactivationForm employeeId={employee.id} deactivated={deactivated} />
      </section>
    </>
  );
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
