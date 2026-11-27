"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Tapped } from "./pin-step";

/** How long the confirmation stays before the Kiosk returns to the name list. */
const SHOW_FOR_MS = 5_000;

/** Says what the tap did, then returns to the name list by itself. */
export function Confirmation({ tapped, onDone }: { tapped: Tapped; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <section
      role="status"
      aria-labelledby="tap-confirmation"
      className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center"
    >
      <h2 id="tap-confirmation" className="font-heading text-3xl font-semibold">
        {tapped.outcome === "clocked-in" ? "Clocked in" : "Clocked out"}
      </h2>
      <p className="text-lg">
        {tapped.name} at <span className="tabular-nums">{tapped.time}</span>
      </p>
      <p className="text-muted-foreground">
        Worked today: <span className="tabular-nums">{tapped.hoursToday}</span>
      </p>
      <Button type="button" variant="outline" size="lg" onClick={onDone} autoFocus>
        Done
      </Button>
    </section>
  );
}
