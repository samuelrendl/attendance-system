"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logOut } from "./actions";

export function LogOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logOut();
          // A full page load, not a client navigation, so no admin page
          // stays mounted in the browser (Cache Components keeps visited
          // routes alive in hidden <Activity> trees). This is what the Next.js
          // docs recommend for logout ("Preserving UI state").
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is the point here
          window.location.href = "/login";
        })
      }
    >
      Log out
    </Button>
  );
}
