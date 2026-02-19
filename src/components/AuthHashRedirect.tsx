"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Component that detects Supabase auth hash fragments on non-callback pages
 * and redirects to the proper auth callback handler.
 *
 * This handles cases where Supabase redirects to the wrong URL (e.g., root `/`
 * instead of `/auth/callback`) due to misconfiguration.
 */
export function AuthHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check on non-callback pages
    if (pathname.startsWith("/auth/callback")) {
      return;
    }

    // Check if there's a hash fragment with auth-related params
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) {
      return;
    }

    const hashParams = new URLSearchParams(hash.substring(1));

    // Check for auth-related hash parameters
    const hasAccessToken = hashParams.has("access_token");
    const hasError = hashParams.has("error");
    const hasErrorCode = hashParams.has("error_code");

    if (hasAccessToken || hasError || hasErrorCode) {
      // Redirect to auth callback with the hash preserved
      // We use window.location to preserve the hash fragment
      window.location.href = `/auth/callback${hash}`;
    }
  }, [pathname, router]);

  return null;
}
