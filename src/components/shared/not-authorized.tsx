import Link from "next/link";
import { Button } from "@/components/ui";
import { ShieldX } from "lucide-react";

export function NotAuthorized() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ShieldX className="mb-4 h-16 w-16 text-muted-foreground" />
      <h1 className="mb-2 text-2xl font-bold">Not Authorized</h1>
      <p className="mb-6 text-muted-foreground">
        You don&apos;t have permission to access this page.
      </p>
      <div className="flex gap-4">
        <Link href="/app">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
