import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/server";
import { DimensionScore } from "@/types";

function getDimensionStatus(score: number, maxScore: number): {
  label: string;
  badgeClass: string;
  barClass: string;
} {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return { label: "Stark", badgeClass: "bg-green-100 text-green-700", barClass: "bg-green-500" };
  if (pct >= 60) return { label: "Belastbar", badgeClass: "bg-yellow-100 text-yellow-700", barClass: "bg-yellow-500" };
  if (pct >= 40) return { label: "Instabil", badgeClass: "bg-orange-100 text-orange-700", barClass: "bg-orange-500" };
  return { label: "Kritisch", badgeClass: "bg-red-100 text-red-700", barClass: "bg-red-500" };
}

function getOverallStatus(score: number): string {
  if (score >= 80) return "Stark";
  if (score >= 60) return "Belastbar";
  if (score >= 40) return "Instabil";
  return "Kritisch";
}

function getOverallStatusClass(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-yellow-100 text-yellow-700";
  if (score >= 40) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default async function PortalScorecardPage() {
  await requireAuth();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  if (!profile.company_id) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold text-[#0f2b3c]">Ihre PSEI Scorecard</h1>
        <p className="text-muted-foreground">
          Kein Assessment-Ergebnis gefunden. Bitte schließen Sie das PSEI-Diagnostic ab.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("first_name, last_name, total_score, typology_id, typology_name, bottleneck_dimension, bottleneck_score, dimension_scores, diagnostic_completed_at")
    .eq("id", profile.company_id)
    .single();

  if (!lead) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold text-[#0f2b3c]">Ihre PSEI Scorecard</h1>
        <p className="text-muted-foreground">Keine Daten gefunden.</p>
      </div>
    );
  }

  const dimensionScores: DimensionScore[] = Array.isArray(lead.dimension_scores)
    ? (lead.dimension_scores as DimensionScore[])
    : [];

  const totalScore = lead.total_score ?? 0;
  const overallStatus = getOverallStatus(totalScore);
  const overallStatusClass = getOverallStatusClass(totalScore);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0f2b3c]">Ihre PSEI Scorecard</h1>
        <p className="mt-1 text-muted-foreground">
          People Strategy &amp; Execution Index — vollständige Auswertung
        </p>
        {lead.diagnostic_completed_at && (
          <p className="mt-1 text-sm text-muted-foreground">
            Abgeschlossen am {new Date(lead.diagnostic_completed_at).toLocaleDateString("de-DE")}
          </p>
        )}
      </div>

      {/* Overall Score */}
      <Card className="mb-8 rounded-xl border-2 border-[#2d8a8a]">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <div className="sm:mr-8">
              <p className="text-sm font-medium uppercase tracking-wide text-[#2d8a8a]">
                Gesamtergebnis
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-6xl font-bold text-[#0f2b3c]">{totalScore}</span>
                <span className="text-2xl text-muted-foreground">/ 100</span>
              </div>
              <span
                className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-medium ${overallStatusClass}`}
              >
                {overallStatus}
              </span>
            </div>
            {lead.typology_name && (
              <div className="mt-6 sm:mt-0 sm:border-l sm:pl-8">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Typologieprofil
                </p>
                <p className="mt-2 text-2xl font-bold text-[#0f2b3c]">{lead.typology_name}</p>
              </div>
            )}
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-6">
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-[#2d8a8a] transition-all"
                style={{ width: `${totalScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Breakdown */}
      {dimensionScores.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-[#0f2b3c]">
            Dimension für Dimension
          </h2>
          <div className="space-y-4">
            {dimensionScores.map((dim) => {
              const maxScore = dim.maxScore ?? 20;
              const pct = dim.percentage ?? Math.round((dim.score / maxScore) * 100);
              const status = getDimensionStatus(dim.score, maxScore);
              const isBottleneck = lead.bottleneck_dimension === dim.name;

              return (
                <Card
                  key={dim.name}
                  className={`rounded-xl ${isBottleneck ? "border-2 border-red-300 bg-red-50/30" : "border"}`}
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#0f2b3c]">{dim.name}</h3>
                        {isBottleneck && (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                            Hauptengpass
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-[#0f2b3c]">
                          {dim.score}/{maxScore}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${status.badgeClass}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${status.barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-right text-sm text-muted-foreground">{pct}%</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottleneck Highlight */}
      {lead.bottleneck_dimension && (
        <Card className="rounded-xl border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-700">Hauptengpass: {lead.bottleneck_dimension}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Diese Dimension hat den größten Einfluss auf Ihren Gesamtscore.
              Fokussieren Sie Ihre Entwicklungsmaßnahmen hier, um den größten Hebel zu erzielen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
