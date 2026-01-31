import { createClient } from "@/lib/supabase/server";
import { Profile, UserRole } from "@/types";

/**
 * Gets the profile for the current authenticated user.
 * The profiles.id column matches auth.users.id (set via trigger on signup).
 *
 * @returns The user's profile or null if not found
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    // If table doesn't exist yet, return a mock profile for development
    if (error.code === "PGRST116" || error.code === "42P01") {
      console.warn("Profiles table not found. Using mock profile for development.");
      return {
        id: user.id,
        role: "customer" as UserRole, // Default role for development
        company_id: null,
        created_at: user.created_at,
        updated_at: user.created_at,
      };
    }
    console.error("Error fetching profile:", error.message);
    return null;
  }

  return profile as Profile;
}

/**
 * Gets a profile by ID (admin only).
 *
 * @param id - The profile ID (same as auth user ID)
 * @returns The profile or null if not found/not authorized
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching profile by ID:", error.message);
    return null;
  }

  return profile as Profile;
}
