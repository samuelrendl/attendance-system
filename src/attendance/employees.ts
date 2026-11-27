import { asc, eq, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { AttendanceDatabase } from "./index";
import { hashPin, isValidPin } from "./pin";
import { employee } from "./schema";

/** An Employee as the Admin sees them. The PIN is never part of it. */
export type Employee = {
  id: string;
  name: string;
  /** When the Employee was Deactivated; null while active. */
  deactivatedAt: Date | null;
};

/** Why an Employee command was refused. */
export type EmployeeProblem =
  | "name-missing"
  | "pin-not-4-digits"
  | "employee-not-found";

export type EmployeeResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; problems: EmployeeProblem[] };

const columns = {
  id: employee.id,
  name: employee.name,
  deactivatedAt: employee.deactivatedAt,
};

/** The Employee commands and queries of the Attendance module. */
export function createEmployees(db: AttendanceDatabase) {
  async function update(
    employeeId: string,
    values: PgUpdateSetSource<typeof employee>,
  ): Promise<EmployeeResult> {
    if (!isUuid(employeeId)) {
      return notFound();
    }
    const updated = await db
      .update(employee)
      .set(values)
      .where(eq(employee.id, employeeId))
      .returning({ id: employee.id });
    return updated.length > 0 ? { ok: true } : notFound();
  }

  return {
    /** Adds an active Employee. PINs don't have to be unique. */
    async addEmployee(input: {
      name: string;
      pin: string;
    }): Promise<EmployeeResult<{ employee: Employee }>> {
      const name = input.name.trim();
      const problems = [
        ...nameProblems(name),
        ...pinProblems(input.pin),
      ];
      if (problems.length > 0) {
        return { ok: false, problems };
      }
      const [added] = await db
        .insert(employee)
        .values({ name, pinHash: await hashPin(input.pin) })
        .returning(columns);
      return { ok: true, employee: added };
    },

    /** Gives an Employee a new name. */
    async renameEmployee(employeeId: string, newName: string): Promise<EmployeeResult> {
      const name = newName.trim();
      const problems = nameProblems(name);
      if (problems.length > 0) {
        return { ok: false, problems };
      }
      return update(employeeId, { name });
    },

    /** Gives an Employee a new 4-digit PIN. */
    async setEmployeePin(employeeId: string, pin: string): Promise<EmployeeResult> {
      const problems = pinProblems(pin);
      if (problems.length > 0) {
        return { ok: false, problems };
      }
      return update(employeeId, { pinHash: await hashPin(pin) });
    },

    /**
     * Deactivates an Employee who has left: they drop off the Kiosk, and their
     * Time entries are kept, including an open one. Deactivating them again
     * keeps the original date.
     */
    async deactivateEmployee(employeeId: string, now: Date): Promise<EmployeeResult> {
      return update(employeeId, {
        deactivatedAt: sql`coalesce(${employee.deactivatedAt}, ${now.toISOString()}::timestamptz)`,
      });
    },

    /** Makes a Deactivated Employee active again, with their history intact. */
    async reactivateEmployee(employeeId: string): Promise<EmployeeResult> {
      return update(employeeId, { deactivatedAt: null });
    },

    /** Every Employee, active and Deactivated, by name. */
    async listEmployees(): Promise<Employee[]> {
      return db.select(columns).from(employee).orderBy(asc(employee.name), asc(employee.id));
    },

    /** One Employee, or null if there is none with that id. */
    async findEmployee(employeeId: string): Promise<Employee | null> {
      if (!isUuid(employeeId)) {
        return null;
      }
      const [found] = await db
        .select(columns)
        .from(employee)
        .where(eq(employee.id, employeeId));
      return found ?? null;
    },
  };
}

function notFound(): { ok: false; problems: EmployeeProblem[] } {
  return { ok: false, problems: ["employee-not-found"] };
}

function nameProblems(name: string): EmployeeProblem[] {
  return name === "" ? ["name-missing"] : [];
}

function pinProblems(pin: string): EmployeeProblem[] {
  return isValidPin(pin) ? [] : ["pin-not-4-digits"];
}

/** Ids come from URLs and forms; anything that isn't a UUID can't be an Employee. */
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
