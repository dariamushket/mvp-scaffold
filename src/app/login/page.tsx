"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";
import { getClient } from "@/lib/supabase/client";
import { AlertCircle, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/portal";
  const code = searchParams.get("code");
  const [isExchangingLink, setIsExchangingLink] = useState(!!code);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setIsExchangingLink(false);
      return;
    }

    const next = encodeURIComponent("/set-password");
    const exchangeUrl = `/auth/callback?code=${encodeURIComponent(code)}&next=${next}`;
    router.replace(exchangeUrl);
  }, [code, redirect, router]);

  if (isExchangingLink) {
    return (
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2d8a8a]" />
          <div>
            <h2 className="text-lg font-semibold text-[#0f2b3c]">Link wird überprüft...</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bitte warten Sie einen Moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = getClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    // Fetch user's role to determine redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    // Redirect based on role: admin → /admin, customer → /portal
    const roleRedirect = profile?.role === "admin" ? "/admin" : "/portal";
    router.push(roleRedirect);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
      <CardContent className="p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
          <h1 className="mt-2 text-2xl font-semibold text-[#0f2b3c]">Willkommen zurück</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Melden Sie sich an, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              E-Mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="ihre@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 rounded-lg border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">
              Passwort
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 rounded-lg border-gray-200"
            />
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">Angemeldet bleiben</span>
            </label>
            <button
              type="button"
              className="text-sm text-[#2d8a8a] hover:underline"
              onClick={() => {
                // Placeholder - password reset not implemented yet
                alert("Passwort-Zurücksetzung ist noch nicht verfügbar.");
              }}
            >
              Passwort vergessen?
            </button>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-[#2d8a8a] text-white hover:bg-[#257373]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anmelden...
              </>
            ) : (
              "Anmelden"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-muted-foreground">oder</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Invite-only notice */}
        <p className="text-center text-sm text-muted-foreground">
          Dies ist eine Invite-only Plattform.{" "}
          <span className="text-[#2d8a8a]">Kontaktieren Sie Ihren Administrator.</span>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-4">
      <Suspense
        fallback={
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#2d8a8a]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
