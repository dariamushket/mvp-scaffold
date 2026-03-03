"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, CalendarCheck, Download } from "lucide-react";
import { DimensionScore } from "@/types";

interface LeadCurrentScoreProps {
  leadId: string;
  currentScore: number | null;
  currentDimensionScores: DimensionScore[] | null;
  dimensionScores: DimensionScore[]; // original assessment scores (used as template)
  tasksCompleted: number;
  sessionsCompleted: number;
  materialsDownloaded: number;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getDimensionStatus(score: number, maxScore: number): { label: string; color: string } {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return { label: "Stark", color: "bg-green-100 text-green-700" };
  if (pct >= 60) return { label: "Belastbar", color: "bg-yellow-100 text-yellow-700" };
  if (pct >= 40) return { label: "Instabil", color: "bg-orange-100 text-orange-700" };
  return { label: "Kritisch", color: "bg-red-100 text-red-700" };
}

export function LeadCurrentScore({
  leadId,
  currentScore,
  currentDimensionScores,
  dimensionScores,
  tasksCompleted,
  sessionsCompleted,
  materialsDownloaded,
}: LeadCurrentScoreProps) {
  const [open, setOpen] = useState(true);

  // Overall score
  const [score, setScore] = useState<number | "">(currentScore ?? "");
  const [savingScore, setSavingScore] = useState(false);
  const [savedScore, setSavedScore] = useState(false);
  const [scoreError, setScoreError] = useState("");

  // Dimension scores — seed from current if set, else from original assessment
  const seedDimensions = (currentDimensionScores ?? dimensionScores).map((d) => ({
    name: d.name,
    score: d.score,
    maxScore: d.maxScore ?? 20,
  }));
  const [dims, setDims] = useState(seedDimensions);
  const [savingDims, setSavingDims] = useState(false);
  const [savedDims, setSavedDims] = useState(false);
  const [dimsError, setDimsError] = useState("");

  const handleSaveScore = async () => {
    if (score === "" || typeof score !== "number") return;
    setSavingScore(true);
    setScoreError("");
    setSavedScore(false);
    try {
      const res = await fetch(`/api/leads/${leadId}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_score: score }),
      });
      if (!res.ok) {
        const b = await res.json();
        setScoreError(b.error ?? "Fehler");
        return;
      }
      setSavedScore(true);
      setTimeout(() => setSavedScore(false), 2000);
    } catch {
      setScoreError("Netzwerkfehler");
    } finally {
      setSavingScore(false);
    }
  };

  const handleSaveDims = async () => {
    setSavingDims(true);
    setDimsError("");
    setSavedDims(false);
    try {
      const payload = dims.map((d) => ({
        name: d.name,
        score: d.score,
        maxScore: d.maxScore,
        percentage: d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0,
      }));
      const res = await fetch(`/api/leads/${leadId}/dimensions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_dimension_scores: payload }),
      });
      if (!res.ok) {
        const b = await res.json();
        setDimsError(b.error ?? "Fehler");
        return;
      }
      setSavedDims(true);
      setTimeout(() => setSavedDims(false), 2000);
    } catch {
      setDimsError("Netzwerkfehler");
    } finally {
      setSavingDims(false);
    }
  };

  const updateDimScore = (idx: number, value: number) => {
    setDims((prev) => prev.map((d, i) => i === idx ? { ...d, score: value } : d));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Aktueller Score</CardTitle>
            <span className={`text-2xl font-bold ${getScoreColor(typeof score === "number" ? score : null)}`}>
              {typeof score === "number" ? score : "—"}
            </span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-1 hover:bg-muted text-muted-foreground"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5">
          {/* Overall score editor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d8a8a]/50"
                value={score}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0–100"
              />
              <Button
                size="sm"
                className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
                onClick={handleSaveScore}
                disabled={savingScore || score === ""}
              >
                {savingScore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Speichern"}
              </Button>
              {savedScore && <span className="text-xs text-green-600">Gespeichert</span>}
            </div>
            {scoreError && <p className="text-xs text-destructive">{scoreError}</p>}
          </div>

          {/* Sub-stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center mb-1 text-[#2d8a8a]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-[#0f2b3c]">{tasksCompleted}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Aufgaben erledigt</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center mb-1 text-[#2d8a8a]">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-[#0f2b3c]">{sessionsCompleted}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Sessions abgeschlossen</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center mb-1 text-[#2d8a8a]">
                <Download className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-[#0f2b3c]">{materialsDownloaded}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Materialien heruntergeladen</div>
            </div>
          </div>

          {/* Editable dimensions */}
          {dims.length > 0 && (
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-medium text-muted-foreground pt-2">Aktuelle Dimensionen</p>
              {dims.map((dim, idx) => {
                const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
                const status = getDimensionStatus(dim.score, dim.maxScore);
                return (
                  <div key={dim.name} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{dim.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={dim.maxScore}
                          className="w-14 rounded border px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#2d8a8a]"
                          value={dim.score}
                          onChange={(e) => updateDimScore(idx, Number(e.target.value))}
                        />
                        <span className="text-sm text-muted-foreground">/ {dim.maxScore}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#2d8a8a] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
                  onClick={handleSaveDims}
                  disabled={savingDims}
                >
                  {savingDims ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Dimensionen speichern
                </Button>
                {savedDims && <span className="text-xs text-green-600">Gespeichert</span>}
                {dimsError && <span className="text-xs text-destructive">{dimsError}</span>}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
