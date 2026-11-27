import { cn } from "cn";

/** "Active" or "Deactivated", as a small badge. */
export function EmployeeStatus({ deactivated }: { deactivated: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        deactivated
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border text-muted-foreground",
      )}
    >
      {deactivated ? "Deactivated" : "Active"}
    </span>
  );
}
