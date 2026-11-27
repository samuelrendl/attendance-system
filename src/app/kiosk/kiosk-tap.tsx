"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { KioskEmployee } from "@/attendance";
import { Confirmation } from "./confirmation";
import { NameList, type PickedEmployee } from "./name-list";
import { PinStep, type Tapped } from "./pin-step";

type Step =
  | { step: "name" }
  | { step: "pin"; employee: PickedEmployee }
  | { step: "confirmation"; tapped: Tapped };

/** Re-fetches the name list now and then, so a Kiosk left open stays current. */
const REFRESH_EVERY_MS = 60_000;

/** The Kiosk's tap: pick a name, enter the PIN, see the confirmation, start again. */
export function KioskTap({ employees }: { employees: KioskEmployee[] }) {
  const [current, setCurrent] = useState<Step>({ step: "name" });
  const router = useRouter();
  const backToNames = useCallback(() => setCurrent({ step: "name" }), []);

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);

  switch (current.step) {
    case "name":
      return (
        <NameList
          employees={employees}
          onPick={(employee) => setCurrent({ step: "pin", employee })}
        />
      );
    case "pin":
      return (
        <PinStep
          employee={current.employee}
          onTapped={(tapped) => setCurrent({ step: "confirmation", tapped })}
          onCancel={backToNames}
          // The page re-renders as "This device is not a Kiosk".
          onNotAKiosk={() => router.refresh()}
        />
      );
    case "confirmation":
      return <Confirmation tapped={current.tapped} onDone={backToNames} />;
  }
}
