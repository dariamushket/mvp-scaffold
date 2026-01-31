import { Header } from "@/components/layouts";
import { requireAuth } from "@/lib/auth";
import { NotAuthorized } from "@/components/shared";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  if (!auth) {
    return (
      <div className="min-h-screen">
        <Header variant="portal" />
        <main className="container mx-auto max-w-7xl px-4 py-8">
          <NotAuthorized />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header variant="portal" />
      <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
