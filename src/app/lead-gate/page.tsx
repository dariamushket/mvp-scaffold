"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layouts";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { getClient } from "@/lib/supabase/client";

const STORAGE_KEY = "assessment_answers_v1";

type AssessmentStoredState = {
  version: "v1";
  industryId?: string;
  answers: Record<string, number>;
};

type ScoringResult = {
  score: number; // 0..5 integer
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

  // Group by prefix before "_" (strategie_1, umsetzung_2, ...)
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
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const company = String(formData.get("company") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const consentTerms = formData.get("consent_terms");

    if (!name || !email || !consentTerms) {
      setError("Bitte füllen Sie alle Pflichtfelder aus und akzeptieren Sie die Bedingungen.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getClient();
      const scoring = computeScoring(stored);

      // Generate UUID client-side to avoid needing SELECT policy for anon
      const leadId = crypto.randomUUID();

      const { error: leadErr } = await supabase.from("leads").insert({
        id: leadId,
        name,
        email,
        company: company || null,
        phone: phone || null,
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
    } catch (err: any) {
      setError(err?.message ?? "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAssessment) {
    return (
      <div className="min-h-screen">
        <Header variant="public" />
        <main className="container mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Diagnose nicht gefunden</CardTitle>
              <p className="text-muted-foreground">
                Ihre Antworten sind nicht mehr verfügbar. Bitte starten Sie die Diagnose erneut.
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/assessment">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zur Diagnose
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header variant="public" />

      <main className="container mx-auto max-w-lg px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Fast geschafft</CardTitle>
            <p className="text-muted-foreground">
              Geben Sie Ihre Kontaktdaten ein, um Ihr Ergebnis freizuschalten.
            </p>

            {scoringPreview && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Aktueller Score (Vorschau)</span>
                  <span className="font-medium text-foreground">{scoringPreview.score} / 5</span>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" placeholder="Max Mustermann" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail (geschäftlich) *</Label>
                <Input id="email" name="email" type="email" placeholder="max@unternehmen.de" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Unternehmen</Label>
                <Input id="company" name="company" placeholder="Muster GmbH" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+49 123 456789" />
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="consent_marketing"
                    checked={consentMarketing}
                    onChange={(e) => setConsentMarketing(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-muted-foreground">
                    Ich möchte Updates und praxisnahe Hinweise erhalten. Abmeldung jederzeit möglich.
                  </span>
                </label>
              </div>

              <div className="rounded-lg border p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="consent_terms" required className="mt-1 h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm text-muted-foreground">
                    Ich stimme den{" "}
                    <Link href="#" className="text-primary underline">
                      Nutzungsbedingungen
                    </Link>{" "}
                    und der{" "}
                    <Link href="#" className="text-primary underline">
                      Datenschutzerklärung
                    </Link>{" "}
                    zu. *
                  </span>
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/assessment" className="flex-1">
                  <Button variant="outline" className="w-full" type="button" disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück
                  </Button>
                </Link>

                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Wird verarbeitet…"
                  ) : (
                    <>
                      Ergebnis anzeigen
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ihre Informationen sind sicher und werden nicht an Dritte weitergegeben.
        </p>
      </main>
    </div>
  );
}