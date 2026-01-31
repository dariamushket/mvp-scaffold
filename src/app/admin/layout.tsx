import { Header } from "@/components/layouts";
import { requireAdmin } from "@/lib/auth";
import { NotAuthorized } from "@/components/shared";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();

  if (!auth) {
    return (
      <div className="min-h-screen">
        <Header variant="admin" />
        <main className="container mx-auto max-w-7xl px-4 py-8">
          <NotAuthorized />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header variant="admin" />
      <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
