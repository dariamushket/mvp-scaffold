"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
}

interface HeaderProps {
  variant: "public" | "portal" | "admin";
  isAuthenticated?: boolean;
}

const publicNavItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/assessment", label: "Assessment" },
];

const portalNavItems: NavItem[] = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/tasks", label: "Tasks" },
  { href: "/portal/sessions", label: "Sessions" },
  { href: "/portal/materials", label: "Materials" },
];

const adminNavItems: NavItem[] = [
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/task-templates", label: "Aufgaben-Vorlagen" },
  { href: "/admin/tags", label: "Tags" },
];

export function Header({ variant, isAuthenticated = false }: HeaderProps) {
  const pathname = usePathname();

  const navItems =
    variant === "admin" ? adminNavItems : variant === "portal" ? portalNavItems : publicNavItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link href={variant === "public" ? "/" : variant === "admin" ? "/admin/leads" : "/portal"} className="mr-6 flex items-center space-x-2">
          <span className="font-bold">MVP App</span>
          {variant === "admin" && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              Admin
            </span>
          )}
        </Link>

        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          {variant !== "public" && (
            <>
              {variant === "portal" && (
                <Link href="/admin/leads">
                  <Button variant="ghost" size="sm">
                    Admin
                  </Button>
                </Link>
              )}
              {variant === "admin" && (
                <Link href="/portal">
                  <Button variant="ghost" size="sm">
                    Portal
                  </Button>
                </Link>
              )}
              <form action="/api/auth/signout" method="POST">
                <Button variant="outline" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </>
          )}
          {variant === "public" && !isAuthenticated && (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
          {variant === "public" && isAuthenticated && (
            <Link href="/portal">
              <Button size="sm">Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
