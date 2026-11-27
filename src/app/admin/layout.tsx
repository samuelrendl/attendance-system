import { LogOutButton } from "./log-out-button";

// Only static chrome here: the Admin session is checked by each page and
// Server Action with requireAdmin(), never in this layout.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
          <span className="font-heading font-semibold">Attendance</span>
          <LogOutButton />
        </div>
      </header>
      {children}
    </>
  );
}
