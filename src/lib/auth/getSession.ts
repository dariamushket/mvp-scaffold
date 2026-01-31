import { createClient } from "@/lib/supabase/server";

/**
 * Gets the current user session from Supabase.
 * Use this in Server Components, Route Handlers, and Server Actions.
 *
 * @returns The session object or null if not authenticated
 */
export async function getSession() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting session:", error.message);
    return null;
  }

  return session;
}

/**
 * Gets the current user from Supabase.
 * This is more secure than getSession() as it validates the token with Supabase.
 *
 * @returns The user object or null if not authenticated
 */
export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user:", error.message);
    return null;
  }

  return user;
}
