"use client";

import type { KioskEmployee } from "@/attendance";

/** The Employee picked on the name step: all the PIN step and confirmation need. */
export type PickedEmployee = { id: string; name: string };

/**
 * The Kiosk's name step: a plain list of active Employees. Ticket 08
 * replaces it with the UI SDK picker; anything with this props shape will do.
 */
export function NameList({
  employees,
  onPick,
}: {
  employees: KioskEmployee[];
  onPick: (employee: PickedEmployee) => void;
}) {
  if (employees.length === 0) {
    return (
      <p className="text-muted-foreground">
        No Employees yet. The Admin adds them in the admin area.
      </p>
    );
  }

  return (
    <section aria-labelledby="pick-your-name" className="flex flex-col gap-4">
      <h2 id="pick-your-name" className="text-lg text-muted-foreground">
        Tap your name
      </h2>
      <ul aria-label="Employees" className="grid gap-3 sm:grid-cols-2">
        {employees.map((employee) => (
          <li key={employee.id}>
            <button
              type="button"
              onClick={() => onPick({ id: employee.id, name: employee.name })}
              className="w-full rounded-lg border px-4 py-4 text-left text-lg font-medium hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {employee.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
