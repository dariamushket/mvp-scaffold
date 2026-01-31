"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";
import { getClient } from "@/lib/supabase/client";
import { AlertCircle, Check, Circle, CheckCircle, Loader2 } from "lucide-react";

const MIN_PASSWORD_LENGTH = 10;

type PasswordRequirement = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "Mindestens 10 Zeichen",
    test: (p) => p.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "uppercase",
    label: "Groß- und Kleinbuchstaben",
    test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  },
  {
    id: "number",
    label: "Mindestens eine Zahl",
    test: (p) => /\d/.test(p),
  },
  {
    id: "special",
    label: "Mindestens ein Sonderzeichen",
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requirementsMet = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }));
  }, [password]);

  const allRequirementsMet = requirementsMet.every((r) => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = allRequirementsMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allRequirementsMet) {
      setError("Bitte erfüllen Sie alle Passwortanforderungen.");
      return;
    }

    if (!passwordsMatch) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);

    const supabase = getClient();

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Benutzer nicht gefunden. Bitte melden Sie sich erneut an.");
      setIsLoading(false);
      return;
    }

    // Update profile to mark password as set
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ has_password: true })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError.message);
      // Don't block the user - password was set successfully
    }

    setSuccess(true);

    // Redirect to portal after a short delay
    setTimeout(() => {
      router.push("/portal");
      router.refresh();
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-4">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardContent className="p-8">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[#0f2b3c]">Passwort gespeichert!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sie werden weitergeleitet...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
                <h1 className="mt-2 text-2xl font-semibold text-[#0f2b3c]">Passwort erstellen</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Willkommen! Bitte erstellen Sie ein sicheres Passwort für Ihr Konto.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-muted-foreground">
                    Passwort
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-lg border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
                    Passwort bestätigen
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-lg border-gray-200"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">Die Passwörter stimmen nicht überein</p>
                  )}
                </div>

                {/* Password requirements */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Passwortanforderungen:</p>
                  <ul className="space-y-1">
                    {requirementsMet.map((req) => (
                      <li key={req.id} className="flex items-center gap-2 text-sm">
                        {req.met ? (
                          <Check className="h-4 w-4 text-[#2d8a8a]" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300" />
                        )}
                        <span className={req.met ? "text-[#2d8a8a]" : "text-muted-foreground"}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-[#2d8a8a] text-white hover:bg-[#257373]"
                  disabled={isLoading || !isValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Passwort speichern"
                  )}
                </Button>
              </form>

              {/* Support link */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Probleme? Kontaktieren Sie{" "}
                <a href="mailto:support@psei.de" className="text-[#2d8a8a] hover:underline">
                  support@psei.de
                </a>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
