import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { NotAuthorized } from "@/components/shared";

const navItems = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/tasks", label: "Tasks" },
  { href: "/portal/sessions", label: "Sessions" },
  { href: "/portal/materials", label: "Materials" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  if (!auth) {
    return <NotAuthorized />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-4">
        <div className="mb-8">
          <Link href="/portal" className="text-lg font-bold">
            MVP Portal
          </Link>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t pt-4">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
