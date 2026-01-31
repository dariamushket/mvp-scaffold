import { redirect } from "next/navigation";
import { getUser } from "./getSession";
import { getProfile } from "./getProfile";
import { UserRole } from "@/types";

interface AuthCheckResult {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
}

/**
 * Checks if the current user has the required role(s).
 * Redirects to login if not authenticated, or returns null if not authorized.
 *
 * @param allowedRoles - Array of roles that are allowed access
 * @returns Object with user and profile, or redirects/returns null
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthCheckResult | null> {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile();

  if (!profile) {
    // User exists but no profile - this shouldn't happen normally
    console.error("User exists but profile not found");
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    // User doesn't have the required role
    return null;
  }

  return { user, profile };
}

/**
 * Requires the user to be authenticated with any role.
 * Redirects to login if not authenticated.
 *
 * @returns Object with user and profile
 */
export async function requireAuth(): Promise<AuthCheckResult | null> {
  return requireRole(["customer", "admin"]);
}

/**
 * Requires the user to be an admin.
 * Redirects to login if not authenticated, returns null if not an admin.
 *
 * @returns Object with user and profile, or null if not admin
 */
export async function requireAdmin(): Promise<AuthCheckResult | null> {
  return requireRole(["admin"]);
}

/**
 * Checks if the current user has admin role without redirecting.
 *
 * @returns Boolean indicating if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}
