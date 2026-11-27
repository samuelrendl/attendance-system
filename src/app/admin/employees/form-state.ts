import type { EmployeeProblem } from "@/attendance";

/** What an Employee form shows after a submit. */
export type EmployeeFormState = {
  /** The name to show again after a refused submit. */
  name?: string;
  errors?: { name?: string; pin?: string; form?: string };
  /** A confirmation after a successful submit. */
  message?: string;
};

/** The Attendance module's reasons for refusing, as form messages. */
export function problemsToErrors(
  problems: EmployeeProblem[],
): NonNullable<EmployeeFormState["errors"]> {
  const errors: NonNullable<EmployeeFormState["errors"]> = {};
  for (const problem of problems) {
    switch (problem) {
      case "name-missing":
        errors.name = "Enter a name.";
        break;
      case "pin-not-4-digits":
        errors.pin = "The PIN must be exactly 4 digits.";
        break;
      case "employee-not-found":
        errors.form = "This Employee doesn't exist.";
        break;
    }
  }
  return errors;
}
