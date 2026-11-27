"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tapAtKiosk, type KioskTapView } from "./actions";
import type { PickedEmployee } from "./name-list";

/** A tap that clocked the Employee in or out. */
export type Tapped = Extract<KioskTapView, { outcome: "clocked-in" | "clocked-out" }>;

const messages: Record<Exclude<KioskTapView["outcome"], Tapped["outcome"]>, string> = {
  "wrong-pin": "Wrong PIN. Try again.",
  "unknown-employee": "You can't clock in or out here. Ask the Admin.",
  "not-a-kiosk": "This device is no longer a Kiosk.",
};

/**
 * The PIN step for the Employee picked on the name step. It doesn't care how
 * they were picked. A wrong PIN stays here with a plain message.
 */
export function PinStep({
  employee,
  onTapped,
  onCancel,
  onNotAKiosk,
}: {
  employee: PickedEmployee;
  onTapped: (tapped: Tapped) => void;
  onCancel: () => void;
  onNotAKiosk: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      let view: KioskTapView;
      try {
        view = await tapAtKiosk(employee.id, pin);
      } catch {
        // E.g. the app was redeployed under this tab: a reload fixes it.
        setError("Something went wrong. Try again, or reload the page.");
        return;
      }
      if (view.outcome === "clocked-in" || view.outcome === "clocked-out") {
        onTapped(view);
        return;
      }
      setPin("");
      setError(messages[view.outcome]);
      input.current?.focus();
      if (view.outcome === "not-a-kiosk") {
        onNotAKiosk();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">{employee.name}</h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="kiosk-pin">PIN</Label>
        <Input
          ref={input}
          id="kiosk-pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          pattern="[0-9]{4}"
          required
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? true : undefined}
          aria-describedby="kiosk-pin-error"
          className="h-12 max-w-40 text-center text-2xl tracking-[0.5em]"
        />
      </div>
      <p id="kiosk-pin-error" aria-live="polite" className="min-h-5 text-sm text-destructive">
        {error}
      </p>
      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending || pin.length !== 4}>
          {pending ? "Checking…" : "OK"}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onCancel} disabled={pending}>
          Back
        </Button>
      </div>
    </form>
  );
}
