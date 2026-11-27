import Link from "next/link";
import { LogOutButton } from "./log-out-button";

// Only static chrome here: the Admin session is checked by each page and
// Server Action with requireAdmin(), never in this layout.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <span className="font-heading font-semibold">Attendance</span>
            <Link href="/admin">On site now</Link>
            <Link href="/admin/employees">Employees</Link>
            <Link href="/admin/kiosks">Kiosks</Link>
          </nav>
          <LogOutButton />
        </div>
      </header>
      {children}
    </>
  );
}
