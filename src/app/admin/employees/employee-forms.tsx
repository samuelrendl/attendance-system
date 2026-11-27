"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addEmployee,
  deactivateEmployee,
  reactivateEmployee,
  renameEmployee,
  setEmployeePin,
} from "./actions";
import type { EmployeeFormState } from "./form-state";

const initialState: EmployeeFormState = {};

export function AddEmployeeForm() {
  const [state, formAction, pending] = useActionState(addEmployee, initialState);
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <NameField id={`${id}-name`} defaultValue={state.name} error={state.errors?.name} />
        <PinField id={`${id}-pin`} label="PIN" error={state.errors?.pin} />
      </div>
      <FormFooter state={state}>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add Employee"}
        </Button>
      </FormFooter>
    </form>
  );
}

export function RenameEmployeeForm({
  employeeId,
  name,
}: {
  employeeId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    renameEmployee.bind(null, employeeId),
    initialState,
  );
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <NameField id={`${id}-name`} defaultValue={state.name ?? name} error={state.errors?.name} />
      <FormFooter state={state}>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </FormFooter>
    </form>
  );
}

export function SetPinForm({ employeeId }: { employeeId: string }) {
  const [state, formAction, pending] = useActionState(
    setEmployeePin.bind(null, employeeId),
    initialState,
  );
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PinField id={`${id}-pin`} label="New PIN" error={state.errors?.pin} />
      <FormFooter state={state}>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Setting…" : "Set PIN"}
        </Button>
      </FormFooter>
    </form>
  );
}

/** Deactivate, or reactivate, depending on whether the Employee is Deactivated. */
export function DeactivationForm({
  employeeId,
  deactivated,
}: {
  employeeId: string;
  deactivated: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    (deactivated ? reactivateEmployee : deactivateEmployee).bind(null, employeeId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormFooter state={state}>
        <Button
          type="submit"
          variant={deactivated ? "outline" : "destructive"}
          disabled={pending}
        >
          {deactivated ? "Reactivate" : "Deactivate"}
        </Button>
      </FormFooter>
    </form>
  );
}

function NameField({
  id,
  defaultValue,
  error,
}: {
  id: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Name</Label>
      <Input
        id={id}
        name="name"
        autoComplete="off"
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        required
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** A 4-digit PIN, masked so it's never shown on screen. */
function PinField({ id, label, error }: { id: string; label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{4}"
        minLength={4}
        maxLength={4}
        title="4 digits"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        required
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) {
    return null;
  }
  return (
    <p id={id} className="text-sm text-destructive">
      {error}
    </p>
  );
}

function FormFooter({
  state,
  children,
}: {
  state: EmployeeFormState;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      <p aria-live="polite" className="text-sm">
        {state.errors?.form ? (
          <span className="text-destructive">{state.errors.form}</span>
        ) : (
          <span className="text-muted-foreground">{state.message}</span>
        )}
      </p>
    </div>
  );
}
