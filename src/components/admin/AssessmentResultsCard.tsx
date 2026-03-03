"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DimensionScore } from "@/types";

interface AssessmentResultsCardProps {
  totalScore: number | null;
  typologyName: string | null;
  bottleneckDimension: string | null;
  dimensionScores: DimensionScore[];
}

function getDimensionStatus(score: number, maxScore: number): { label: string; color: string } {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return { label: "Stark", color: "bg-green-100 text-green-700" };
  if (pct >= 60) return { label: "Belastbar", color: "bg-yellow-100 text-yellow-700" };
  if (pct >= 40) return { label: "Instabil", color: "bg-orange-100 text-orange-700" };
  return { label: "Kritisch", color: "bg-red-100 text-red-700" };
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export function AssessmentResultsCard({
  totalScore,
  typologyName,
  bottleneckDimension,
  dimensionScores,
}: AssessmentResultsCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Assessment-Ergebnisse</CardTitle>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-1 hover:bg-muted text-muted-foreground"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(totalScore)}`}>
                {totalScore != null ? `${totalScore}/100` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">PSEI Score</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-lg font-semibold">{typologyName ?? "—"}</div>
              <div className="text-sm text-muted-foreground">Typology</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-lg font-semibold">{bottleneckDimension ?? "—"}</div>
              <div className="text-sm text-muted-foreground">Primary Bottleneck</div>
            </div>
          </div>

          {dimensionScores.length > 0 && (
            <>
              <h4 className="mb-3 font-medium">Dimension Breakdown</h4>
              <div className="space-y-3">
                {dimensionScores.map((dim) => {
                  const maxScore = dim.maxScore ?? 20;
                  const pct = dim.percentage ?? Math.round((dim.score / maxScore) * 100);
                  const status = getDimensionStatus(dim.score, maxScore);
                  const isBottleneck = bottleneckDimension === dim.name;
                  return (
                    <div
                      key={dim.name}
                      className={`rounded-lg border p-3 ${isBottleneck ? "border-red-200 bg-red-50/50" : ""}`}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{dim.name}</span>
                          {isBottleneck && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                              Bottleneck
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {dim.score}/{maxScore}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#2d8a8a]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
