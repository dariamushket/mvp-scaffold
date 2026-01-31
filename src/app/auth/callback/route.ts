import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (!code) {
    // No code provided - redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

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

  // Exchange the code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Error exchanging code for session:", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Get the authenticated user
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
    .select("id, has_password")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code === "PGRST116") {
    // Profile doesn't exist - create it
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      role: "customer",
      has_password: false,
    });

    if (insertError) {
      console.error("Error creating profile:", insertError.message);
      return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`);
    }

    // New user - redirect to set password
    return NextResponse.redirect(`${origin}/set-password`);
  }

  if (profileError) {
    console.error("Error fetching profile:", profileError.message);
    return NextResponse.redirect(`${origin}/login?error=profile_error`);
  }

  // Profile exists - check if password is set
  if (!profile.has_password) {
    return NextResponse.redirect(`${origin}/set-password`);
  }

  // User has password set - redirect to portal
  return NextResponse.redirect(`${origin}${next}`);
}
