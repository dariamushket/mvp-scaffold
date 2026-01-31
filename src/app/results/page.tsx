"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent } from "@/components/ui";
import { ArrowLeft, Calendar, Loader2, AlertTriangle } from "lucide-react";

const BOOKING_URL = "https://calendly.com/psei/executive-diagnose";

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
  const searchParams = useSearchParams();

  const score = Number(searchParams.get("score") ?? 3);
  const type = searchParams.get("type") ?? "Wachstum mit Reibung";
  const bottleneck = searchParams.get("bottleneck") ?? "Strategische Klarheit";
  const leadId = searchParams.get("leadId");

  // Convert 0-5 score to percentage for display
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
              href="/assessment"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#2d8a8a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Übersicht
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
