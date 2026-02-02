"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side auth callback handler for magic link authentication.
 *
 * Supabase magic links use the implicit flow with hash fragments (#access_token=...),
 * which are never sent to the server. This client component reads the hash fragment,
 * sets the session, and then redirects to the server-side /auth/callback/complete
 * route to handle profile creation and role-based redirects.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1) // Remove the leading #
        );

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // If no hash params, check if this is a PKCE flow with code in query params
        if (!accessToken) {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get("code");

          if (code) {
            // PKCE flow - redirect to the complete route which handles code exchange
            router.replace(`/auth/callback/complete?code=${code}`);
            return;
          }

          // No tokens or code - redirect to login with error
          setStatus("error");
          setErrorMessage("No authentication tokens found in the URL.");
          setTimeout(() => {
            router.replace("/login?error=missing_tokens");
          }, 2000);
          return;
        }

        // We have tokens from magic link - set the session
        const supabase = createClient();

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (error) {
          console.error("Error setting session:", error.message);
          setStatus("error");
          setErrorMessage("Failed to authenticate. Please try again.");
          setTimeout(() => {
            router.replace("/login?error=session_failed");
          }, 2000);
          return;
        }

        // Session set successfully - redirect to complete route for profile handling
        router.replace("/auth/callback/complete");
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setErrorMessage("An unexpected error occurred.");
        setTimeout(() => {
          router.replace("/login?error=unexpected");
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {status === "processing" ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900">
              Completing authentication...
            </h1>
            <p className="text-gray-600 mt-2">Please wait while we sign you in.</p>
          </>
        ) : (
          <>
            <div className="text-red-500 text-4xl mb-4">!</div>
            <h1 className="text-xl font-semibold text-gray-900">
              Authentication Error
            </h1>
            <p className="text-gray-600 mt-2">{errorMessage}</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
