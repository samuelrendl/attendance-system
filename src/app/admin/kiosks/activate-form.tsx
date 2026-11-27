"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activateThisDevice, type ActivateKioskState } from "./actions";

const initialState: ActivateKioskState = { name: "" };

export function ActivateForm() {
  const [state, formAction, pending] = useActionState(
    activateThisDevice,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="kiosk-name">Kiosk name</Label>
        <Input
          id="kiosk-name"
          name="name"
          placeholder="Front door tablet"
          defaultValue={state.name}
          required
        />
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-destructive">
        {state.error}
      </p>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Activating…" : "Activate this device"}
      </Button>
    </form>
  );
}
