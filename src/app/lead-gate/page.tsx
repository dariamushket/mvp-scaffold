"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";
import { AlertCircle, Loader2 } from "lucide-react";

const CONTACT_STORAGE_KEY = "lead_contact_v1";

export type LeadContact = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position: string;
  consentMarketing: boolean;
};

export default function LeadGatePage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const company = String(formData.get("company") ?? "").trim();
    const position = String(formData.get("position") ?? "").trim();

    if (!firstName || !lastName || !email) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Store contact info in localStorage for the results page
      const contact: LeadContact = {
        firstName,
        lastName,
        email,
        company,
        position,
        consentMarketing,
      };
      localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));

      // Redirect to assessment
      router.push("/assessment");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardContent className="p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
            <h1 className="mt-2 text-2xl font-semibold text-[#0f2b3c]">
              Executive Diagnose starten
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Geben Sie Ihre Kontaktdaten ein, um mit der Diagnose zu beginnen.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Name fields side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm text-muted-foreground">
                  Vorname *
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Max"
                  required
                  disabled={isSubmitting}
                  className="h-11 rounded-lg border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm text-muted-foreground">
                  Nachname *
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Mustermann"
                  required
                  disabled={isSubmitting}
                  className="h-11 rounded-lg border-gray-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                E-Mail *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="max@unternehmen.de"
                required
                disabled={isSubmitting}
                className="h-11 rounded-lg border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm text-muted-foreground">
                Unternehmen
              </Label>
              <Input
                id="company"
                name="company"
                placeholder="Mustermann GmbH"
                disabled={isSubmitting}
                className="h-11 rounded-lg border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm text-muted-foreground">
                Position
              </Label>
              <Input
                id="position"
                name="position"
                placeholder="CEO / Geschäftsführer"
                disabled={isSubmitting}
                className="h-11 rounded-lg border-gray-200"
              />
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="consent"
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="consent" className="cursor-pointer text-sm text-muted-foreground">
                Ich stimme der{" "}
                <Link href="#" className="text-[#2d8a8a] hover:underline">
                  Datenschutzerklärung
                </Link>{" "}
                zu und möchte Informationen zu strategischen Führungsthemen erhalten.
              </label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-[#2d8a8a] text-white hover:bg-[#257373]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                "Weiter zur Diagnose"
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Bereits registriert?{" "}
            <Link href="/login" className="text-[#2d8a8a] hover:underline">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
