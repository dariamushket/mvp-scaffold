"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";
import { AlertCircle, Loader2 } from "lucide-react";
import { getClient } from "@/lib/supabase/client";

const STORAGE_KEY = "assessment_answers_v1";

type AssessmentStoredState = {
  version: "v1";
  industryId?: string;
  answers: Record<string, number>;
};

type ScoringResult = {
  score: number;
  businessType: string;
  bottleneck: string;
  dimensionAverages: Record<string, number>;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp0to5(n: number) {
  return Math.max(0, Math.min(5, n));
}

function computeScoring(state: AssessmentStoredState): ScoringResult {
  const answers = state.answers ?? {};

  const buckets: Record<string, number[]> = {};
  for (const [qid, val] of Object.entries(answers)) {
    if (typeof val !== "number") continue;
    const prefix = qid.split("_")[0];
    buckets[prefix] = buckets[prefix] ?? [];
    buckets[prefix].push(clamp0to5(val));
  }

  const dimensionAverages: Record<string, number> = {};
  for (const [dim, vals] of Object.entries(buckets)) {
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    dimensionAverages[dim] = round1(avg);
  }

  const allVals = Object.values(answers).filter((v) => typeof v === "number") as number[];
  const overallAvg = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : 0;
  const score = Math.round(clamp0to5(overallAvg));

  const bottleneckLabelMap: Record<string, string> = {
    strategie: "Strategische Klarheit",
    umsetzung: "Umsetzungsfähigkeit",
    people: "People & Rollen",
    fuehrung: "Führung & Entscheidungen",
    governance: "Governance & Anpassung",
  };

  const dimEntries = Object.entries(dimensionAverages);
  const weakest = dimEntries.length
    ? dimEntries.reduce((min, cur) => (cur[1] < min[1] ? cur : min))
    : (["strategie", 0] as const);

  const bottleneck = bottleneckLabelMap[weakest[0]] ?? "Strategische Klarheit";

  let businessType = "Strukturiert / skalierbar";
  if (score <= 1) businessType = "Reaktiv / Firefighting";
  else if (score <= 3) businessType = "Wachstum mit Reibung";

  return { score, businessType, bottleneck, dimensionAverages };
}

function getStoredAssessment(): AssessmentStoredState | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AssessmentStoredState;
    if (!parsed?.version || !parsed?.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isLikelyUniqueViolation(message?: string) {
  const m = (message ?? "").toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("already exists");
}

export default function LeadGatePage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredAssessment();
    if (!stored) setHasAssessment(false);
  }, []);

  const scoringPreview = useMemo(() => {
    const stored = typeof window !== "undefined" ? getStoredAssessment() : null;
    return stored ? computeScoring(stored) : null;
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const stored = getStoredAssessment();
    if (!stored) {
      setError("Ihre Diagnose-Antworten wurden nicht gefunden. Bitte starten Sie die Diagnose erneut.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const company = String(formData.get("company") ?? "").trim();
    const position = String(formData.get("position") ?? "").trim();

    if (!firstName || !lastName || !email) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getClient();
      const scoring = computeScoring(stored);

      const leadId = crypto.randomUUID();

      const { error: leadErr } = await supabase.from("leads").insert({
        id: leadId,
        name,
        email,
        company: company || null,
        phone: position || null, // Using phone field for position temporarily
        consent_marketing: consentMarketing,
        score: scoring.score,
        business_type: scoring.businessType,
        bottleneck: scoring.bottleneck,
        tags: stored.industryId ? [stored.industryId] : [],
      });

      if (leadErr) {
        if (isLikelyUniqueViolation(leadErr.message)) {
          throw new Error("Diese E-Mail wurde bereits verwendet. Bitte nutzen Sie eine andere E-Mail oder kontaktieren Sie uns.");
        }
        throw leadErr;
      }

      const payload = {
        version: stored.version,
        industryId: stored.industryId ?? null,
        answers: stored.answers,
        meta: { dimensionAverages: scoring.dimensionAverages },
      };

      const { error: assessErr } = await supabase.from("assessments").insert({
        lead_id: leadId,
        answers: payload,
        score: scoring.score,
        completed_at: new Date().toISOString(),
      });

      if (assessErr) throw assessErr;

      const params = new URLSearchParams({
        leadId,
        score: String(scoring.score),
        type: scoring.businessType,
        bottleneck: scoring.bottleneck,
      });

      router.push(`/results?${params.toString()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAssessment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-4">
        <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
            <h1 className="mt-4 text-2xl font-semibold text-[#0f2b3c]">Diagnose nicht gefunden</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ihre Antworten sind nicht mehr verfügbar. Bitte starten Sie die Diagnose erneut.
            </p>
            <Link href="/assessment">
              <Button className="mt-6 bg-[#2d8a8a] hover:bg-[#257373]">
                Zurück zur Diagnose
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardContent className="p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
            <h1 className="mt-2 text-2xl font-semibold text-[#0f2b3c]">
              Ihr Executive Scorecard ist bereit
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Geben Sie Ihre Kontaktdaten ein, um Ihre personalisierten Ergebnisse zu erhalten.
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
                "Ergebnisse anzeigen"
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
