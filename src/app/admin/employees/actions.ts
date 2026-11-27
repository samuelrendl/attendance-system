"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/admin-session";
import { getServer } from "@/server/attendance";
import { problemsToErrors, type EmployeeFormState } from "./form-state";

// Every action checks the Admin session first, parses the form, and leaves
// every rule (what a valid PIN or name is) to the Attendance module.

export async function addEmployee(
  _previous: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireAdmin();
  const name = field(formData, "name");
  const result = await getServer().attendance.addEmployee({
    name,
    pin: field(formData, "pin"),
  });
  if (!result.ok) {
    return { name, errors: problemsToErrors(result.problems) };
  }
  refreshEmployees();
  return { message: `Added ${result.employee.name}.` };
}

export async function renameEmployee(
  employeeId: string,
  _previous: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireAdmin();
  const name = field(formData, "name");
  const result = await getServer().attendance.renameEmployee(employeeId, name);
  if (!result.ok) {
    return { name, errors: problemsToErrors(result.problems) };
  }
  refreshEmployees();
  return { message: "Name saved." };
}

export async function setEmployeePin(
  employeeId: string,
  _previous: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireAdmin();
  const result = await getServer().attendance.setEmployeePin(
    employeeId,
    field(formData, "pin"),
  );
  if (!result.ok) {
    return { errors: problemsToErrors(result.problems) };
  }
  refreshEmployees();
  return { message: "New PIN set." };
}

export async function deactivateEmployee(
  employeeId: string,
): Promise<EmployeeFormState> {
  await requireAdmin();
  const result = await getServer().attendance.deactivateEmployee(employeeId, new Date());
  if (!result.ok) {
    return { errors: problemsToErrors(result.problems) };
  }
  refreshEmployees();
  return {};
}

export async function reactivateEmployee(
  employeeId: string,
): Promise<EmployeeFormState> {
  await requireAdmin();
  const result = await getServer().attendance.reactivateEmployee(employeeId);
  if (!result.ok) {
    return { errors: problemsToErrors(result.problems) };
  }
  refreshEmployees();
  return {};
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Re-renders the Employees list and every Employee page. */
function refreshEmployees() {
  revalidatePath("/admin/employees", "layout");
}
