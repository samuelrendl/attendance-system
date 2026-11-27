import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/server/admin-session";
import { getServer } from "@/server/attendance";
import { AddEmployeeForm } from "./employee-forms";
import { EmployeeStatus } from "./employee-status";

export const metadata: Metadata = {
  title: "Employees · Attendance",
};

export default function EmployeesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <h1 className="font-heading text-2xl font-semibold">Employees</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Employees />
      </Suspense>
    </main>
  );
}

async function Employees() {
  await connection();
  await requireAdmin();
  const employees = await getServer().attendance.listEmployees();

  return (
    <>
      <section aria-labelledby="add-employee" className="flex flex-col gap-4">
        <h2 id="add-employee" className="font-heading text-lg font-medium">
          Add an Employee
        </h2>
        <AddEmployeeForm />
      </section>

      <section aria-labelledby="all-employees" className="flex flex-col gap-4">
        <h2 id="all-employees" className="font-heading text-lg font-medium">
          All Employees
        </h2>
        {employees.length === 0 ? (
          <p className="text-muted-foreground">No Employees yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {employees.map((employee) => (
              <li key={employee.id}>
                <Link
                  href={`/admin/employees/${employee.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span
                    className={
                      employee.deactivatedAt
                        ? "font-medium text-muted-foreground"
                        : "font-medium"
                    }
                  >
                    {employee.name}
                  </span>
                  <EmployeeStatus deactivated={employee.deactivatedAt !== null} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
