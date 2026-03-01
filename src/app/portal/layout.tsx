"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderOpen,
  BarChart2,
  LogOut,
  Loader2,
} from "lucide-react";

const navItems = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, badgeKey: null },
  { href: "/portal/scorecard", label: "Scorecard", icon: BarChart2, badgeKey: null },
  { href: "/portal/tasks", label: "Aufgaben", icon: CheckSquare, badgeKey: "tasks" as const },
  { href: "/portal/sessions", label: "Sessions", icon: Calendar, badgeKey: null },
  { href: "/portal/materials", label: "Materialien", icon: FolderOpen, badgeKey: "materials" as const },
];

type BadgeKey = "tasks" | "materials";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [latestAt, setLatestAt] = useState<Record<BadgeKey, string | null>>({ tasks: null, materials: null });
  const [seenAt, setSeenAt] = useState<Record<BadgeKey, number>>({ tasks: 0, materials: 0 });

  useEffect(() => {
    const supabase = getClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  // Load seen timestamps from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("portal_nav_seen") ?? "{}");
      setSeenAt({
        tasks: stored.tasks ?? 0,
        materials: stored.materials ?? 0,
      });
    } catch {
      // ignore
    }
  }, []);

  // Fetch latest activity timestamps
  useEffect(() => {
    fetch("/api/portal/activity")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setLatestAt({
            tasks: data.tasksLatestAt ?? null,
            materials: data.materialsLatestAt ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Mark nav item as seen when visiting the page
  useEffect(() => {
    const key = pathname.startsWith("/portal/tasks")
      ? "tasks"
      : pathname.startsWith("/portal/materials")
      ? "materials"
      : null;
    if (!key) return;
    const now = Date.now();
    setSeenAt((prev) => {
      const next = { ...prev, [key]: now };
      try {
        localStorage.setItem("portal_nav_seen", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [pathname]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = getClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafa]">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-white">
        {/* Logo */}
        <div className="p-6">
          <Link href="/portal" className="text-xl font-bold text-[#2d8a8a]">
            PSEI
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const bk = item.badgeKey;
            const hasBadge =
              bk !== null &&
              latestAt[bk] !== null &&
              new Date(latestAt[bk]!).getTime() > seenAt[bk];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2d8a8a] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {hasBadge && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#FECACA]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="border-t p-4">
          <div className="mb-3 truncate text-sm text-gray-600">{userEmail || "…"}</div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
