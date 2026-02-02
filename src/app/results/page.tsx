"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent } from "@/components/ui";
import { ArrowLeft, Calendar, Loader2, AlertTriangle } from "lucide-react";
import { getClient } from "@/lib/supabase/client";

const BOOKING_URL = "https://calendly.com/psei/executive-diagnose";

const CONTACT_STORAGE_KEY = "lead_contact_v1";
const ASSESSMENT_STORAGE_KEY = "assessment_answers_v1";

type LeadContact = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position: string;
  consentMarketing: boolean;
};

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

function getStoredContact(): LeadContact | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LeadContact;
  } catch {
    return null;
  }
}

function getStoredAssessment(): AssessmentStoredState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ASSESSMENT_STORAGE_KEY);
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

function getScoreLabel(score: number): string {
  if (score <= 1) return "Kritisch – Dringender Handlungsbedarf";
  if (score <= 2) return "Unterdurchschnittlich – Verbesserungspotenzial";
  if (score <= 3) return "Durchschnittlich – Solide Basis";
  if (score <= 4) return "Gut – Auf gutem Weg";
  return "Exzellent – Execution-fähig";
}

function getScoreColor(score: number): string {
  if (score <= 1) return "text-red-600";
  if (score <= 2) return "text-orange-500";
  if (score <= 3) return "text-yellow-600";
  if (score <= 4) return "text-[#2d8a8a]";
  return "text-green-600";
}

function ResultsContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    score: number;
    type: string;
    bottleneck: string;
    leadId: string;
  } | null>(null);

  useEffect(() => {
    async function processResults() {
      const contact = getStoredContact();
      const assessment = getStoredAssessment();

      // Guard: redirect if no data
      if (!contact || !assessment) {
        router.push("/lead-gate");
        return;
      }

      try {
        const scoring = computeScoring(assessment);
        const supabase = getClient();

        const leadId = crypto.randomUUID();
        const name = `${contact.firstName} ${contact.lastName}`.trim();

        const { error: leadErr } = await supabase.from("leads").insert({
          id: leadId,
          name,
          email: contact.email,
          company: contact.company || null,
          phone: contact.position || null, // Using phone field for position temporarily
          consent_marketing: contact.consentMarketing,
          score: scoring.score,
          business_type: scoring.businessType,
          bottleneck: scoring.bottleneck,
          tags: assessment.industryId ? [assessment.industryId] : [],
        });

        if (leadErr) {
          if (isLikelyUniqueViolation(leadErr.message)) {
            throw new Error("Diese E-Mail wurde bereits verwendet.");
          }
          throw leadErr;
        }

        const payload = {
          version: assessment.version,
          industryId: assessment.industryId ?? null,
          answers: assessment.answers,
          meta: { dimensionAverages: scoring.dimensionAverages },
        };

        const { error: assessErr } = await supabase.from("assessments").insert({
          lead_id: leadId,
          answers: payload,
          score: scoring.score,
          completed_at: new Date().toISOString(),
        });

        if (assessErr) throw assessErr;

        // Clear storage after successful save
        localStorage.removeItem(CONTACT_STORAGE_KEY);
        sessionStorage.removeItem(ASSESSMENT_STORAGE_KEY);

        setResults({
          score: scoring.score,
          type: scoring.businessType,
          bottleneck: scoring.bottleneck,
          leadId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Es ist ein Fehler aufgetreten.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    processResults();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2d8a8a]" />
          <p className="mt-4 text-muted-foreground">Ihre Ergebnisse werden berechnet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-4">
        <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
            <h1 className="mt-4 text-2xl font-semibold text-[#0f2b3c]">Fehler</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link href="/lead-gate">
              <Button className="mt-6 bg-[#2d8a8a] hover:bg-[#257373]">
                Erneut versuchen
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const { score, type, bottleneck, leadId } = results;
  const scorePercent = Math.round((score / 5) * 100);
  const scoreLabel = getScoreLabel(score);
  const scoreColor = getScoreColor(score);

  return (
    <div className="min-h-screen bg-[#f0f7f7]">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#2d8a8a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Startseite
            </Link>
          </div>
          <div className="text-xl font-bold text-[#2d8a8a]">PSEI</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Title Section */}
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-[#2d8a8a]">
            PSEI ERGEBNIS
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0f2b3c]">
            Executive Scorecard
          </h1>
          <p className="mt-1 text-muted-foreground">
            People Strategy & Execution Index
          </p>
        </div>

        {/* Main Score Card */}
        <Card className="mb-6 rounded-2xl border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Score Display */}
              <div className="text-center md:text-left">
                <div className="flex items-baseline justify-center gap-1 md:justify-start">
                  <span className={`text-7xl font-bold ${scoreColor}`}>
                    {scorePercent}
                  </span>
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="mt-2 text-lg font-medium text-[#0f2b3c]">
                  {scoreLabel}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Unternehmenstyp: {type}
                </p>
              </div>

              {/* Bottleneck Highlight */}
              <div className="rounded-xl bg-amber-50 p-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-200">
                    <AlertTriangle className="h-3 w-3 text-amber-700" />
                  </span>
                  <span className="text-sm font-medium text-amber-700">
                    Wachstumsengpass
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[#0f2b3c]">
                  {bottleneck}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Diese Dimension begrenzt aktuell die Gesamtleistung und sollte
                  priorisiert werden.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interpretation Card */}
        <Card className="mb-6 rounded-2xl border-0 shadow-lg">
          <CardContent className="p-8">
            <p className="text-sm font-medium uppercase tracking-wide text-[#2d8a8a]">
              INTERPRETATION
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#0f2b3c]">
              {type === "Reaktiv / Firefighting"
                ? "Ihr Unternehmen ist im Krisenmodus"
                : type === "Wachstum mit Reibung"
                  ? "Ihr Unternehmen wächst, aber mit Reibungsverlusten"
                  : "Ihr Unternehmen ist gut aufgestellt"}
            </h2>
            <div className="mt-4 space-y-2 text-muted-foreground">
              {score <= 2 ? (
                <>
                  <p>• Hoher operativer Druck verhindert strategisches Arbeiten</p>
                  <p>• Entscheidungen werden reaktiv statt proaktiv getroffen</p>
                  <p>• Wachstum ist aktuell nicht skalierbar</p>
                </>
              ) : score <= 4 ? (
                <>
                  <p>• Gute Grundstrukturen sind vorhanden</p>
                  <p>• Einzelne Engpässe bremsen das Wachstum</p>
                  <p>• Mit gezielten Maßnahmen ist Skalierung möglich</p>
                </>
              ) : (
                <>
                  <p>• Klare strategische Ausrichtung</p>
                  <p>• Hohe Umsetzungsqualität</p>
                  <p>• Wachstum ist planbar</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warning Card */}
        <Card className="mb-8 rounded-2xl border-0 bg-[#fff5f5] shadow-lg">
          <CardContent className="p-8">
            <p className="text-sm font-medium text-red-600">
              Was passiert, wenn Sie jetzt nicht handeln?
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#0f2b3c]">
              Kosten der Nicht-Entscheidung
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Jeder Monat ohne Intervention am identifizierten Engpass verstärkt
              systemische Schwächen. Die Kosten manifestieren sich nicht linear,
              sondern exponentiell in Form von Opportunitätsverlusten,
              Talentabwanderung und strategischer Drift.
            </p>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="rounded-2xl bg-[#2d8a8a] p-8 text-center text-white">
          <Button
            asChild
            className="h-12 rounded-lg bg-white px-8 text-[#2d8a8a] hover:bg-gray-100"
          >
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-5 w-5" />
              Executive Diagnose buchen
            </a>
          </Button>
          <p className="mt-4 text-sm text-white/80">
            Buchen Sie eine kostenlose Analyse mit einem unserer Experten
          </p>
        </div>

        {/* Lead ID reference (hidden, for tracking) */}
        {leadId && (
          <input type="hidden" name="leadId" value={leadId} />
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f0f7f7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#2d8a8a]" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
