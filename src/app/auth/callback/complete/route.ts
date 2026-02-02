import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "admin" | "customer";

function getRedirectUrl(role: UserRole): string {
  return role === "admin" ? "/admin" : "/portal";
}

/**
 * Server-side auth callback completion handler.
 *
 * This route handles two scenarios:
 * 1. Called after client-side session setup (magic link flow) - session already exists
 * 2. Called with a code query param (PKCE flow) - needs to exchange code for session
 *
 * After authentication, it handles profile creation and role-based redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Ignore errors in Server Component context
          }
        },
      },
    }
  );

  // If we have a code, exchange it for a session (PKCE flow)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  // Get the authenticated user (session should exist from either magic link or PKCE)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error getting user:", userError?.message);
    return NextResponse.redirect(`${origin}/login?error=user_not_found`);
  }

  // Check if profile exists, create if not
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, has_password, role")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code === "PGRST116") {
    // Profile doesn't exist - create it (default to customer role)
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      role: "customer",
      has_password: false,
    });

    if (insertError) {
      console.error("Error creating profile:", insertError.message);
      return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`);
    }

    // New user - redirect to set password with customer redirect
    const redirectUrl = getRedirectUrl("customer");
    return NextResponse.redirect(`${origin}/set-password?redirect=${encodeURIComponent(redirectUrl)}`);
  }

  if (profileError && (profileError.code === "42P01" || profileError.code === "42703")) {
    console.warn("Profiles schema not ready yet. Redirecting to set password.");
    return NextResponse.redirect(`${origin}/set-password`);
  }

  if (profileError) {
    console.error("Error fetching profile:", profileError.message);
    return NextResponse.redirect(`${origin}/login?error=profile_error`);
  }

  // Get role-appropriate redirect URL
  const role = (profile.role as UserRole) || "customer";
  const redirectUrl = getRedirectUrl(role);

  // Profile exists - check if password is set
  if (!profile.has_password) {
    return NextResponse.redirect(`${origin}/set-password?redirect=${encodeURIComponent(redirectUrl)}`);
  }

  // User has password set - redirect to role-appropriate dashboard
  return NextResponse.redirect(`${origin}${redirectUrl}`);
}
