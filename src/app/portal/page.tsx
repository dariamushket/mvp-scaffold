import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { Calendar, BarChart2 } from "lucide-react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/server";
import { DimensionScore } from "@/types";

const BOOKING_URL = "https://calendly.com/tcinar/psei";

function getStatusLabel(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return "Stark";
  if (pct >= 60) return "Belastbar";
  if (pct >= 40) return "Instabil";
  return "Kritisch";
}

function getStatusBadgeClass(label: string): string {
  const map: Record<string, string> = {
    Stark: "bg-green-100 text-green-700",
    Belastbar: "bg-yellow-100 text-yellow-700",
    Instabil: "bg-orange-100 text-orange-700",
    Kritisch: "bg-red-100 text-red-700",
  };
  return map[label] ?? "bg-gray-100 text-gray-700";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-[#2d8a8a]";
  if (score >= 40) return "text-yellow-600";
  return "text-orange-500";
}

export default async function PortalDashboardPage() {
  await requireAuth();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  let lead: {
    first_name: string;
    total_score: number | null;
    typology_name: string | null;
    bottleneck_dimension: string | null;
    dimension_scores: DimensionScore[] | null;
  } | null = null;

  if (profile.company_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leads")
      .select("first_name, total_score, typology_name, bottleneck_dimension, dimension_scores")
      .eq("id", profile.company_id)
      .single();
    lead = data;
  }

  const userName = lead?.first_name ?? "there";
  const score = lead?.total_score ?? null;
  const scoreLabel = score != null ? getStatusLabel(score, 100) : "—";
  const dimensionScores: DimensionScore[] = Array.isArray(lead?.dimension_scores)
    ? (lead!.dimension_scores as DimensionScore[])
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">
            Guten Tag, {userName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Ihr People Strategy &amp; Execution Index Überblick
          </p>
        </div>
        <Button
          asChild
          className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
        >
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            Strategiegespräch buchen
          </a>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {/* PSEI Score Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#2d8a8a]">Ihr PSEI Score</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-5xl font-bold ${score != null ? getScoreColor(score) : "text-[#0f2b3c]"}`}>
                {score ?? "—"}
              </span>
              {score != null && (
                <span className="text-xl text-muted-foreground">/ 100</span>
              )}
            </div>
            {score != null && (
              <div className="mt-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(scoreLabel)}`}
                >
                  {scoreLabel}
                </span>
              </div>
            )}
            {lead?.typology_name && (
              <p className="mt-2 text-sm text-muted-foreground">{lead.typology_name}</p>
            )}
          </CardContent>
        </Card>

        {/* Scorecard Link Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#0f2b3c]">Dimension-Analyse</p>
            <div className="mt-2 flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-[#2d8a8a]" />
              <span className="text-lg font-bold text-[#0f2b3c]">
                {dimensionScores.length > 0 ? `${dimensionScores.length} Dimensionen` : "Ausstehend"}
              </span>
            </div>
            <div className="mt-4">
              <Link href="/portal/scorecard">
                <Button size="sm" variant="outline" className="w-full">
                  Scorecard ansehen
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Next Session Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#2d8a8a]">Nächste Session</p>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0f2b3c]" />
              <span className="text-2xl font-bold text-[#0f2b3c]">Buchen</span>
            </div>
            <div className="mt-4">
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="w-full">
                  Termin wählen
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimensions Overview */}
      {dimensionScores.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-[#0f2b3c]">
            Ihre Dimensionen im Überblick
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dimensionScores.slice(0, 4).map((dim) => {
              const maxScore = dim.maxScore ?? 20;
              const pct = dim.percentage ?? Math.round((dim.score / maxScore) * 100);
              const label = getStatusLabel(dim.score, maxScore);
              return (
                <Card key={dim.name} className="rounded-xl border shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-[#0f2b3c]">{dim.name}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getScoreColor(pct)}`}>
                        {pct}%
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(label)}`}
                      >
                        {label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Action CTA */}
      <Card className="mt-8 rounded-xl border-[#2d8a8a] bg-[#f0f7f7]">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-[#0f2b3c]">Nächster Schritt</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Buchen Sie ein Strategiegespräch, um Ihre Ergebnisse zu besprechen
              und einen Aktionsplan zu erstellen.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 bg-[#2d8a8a] text-white hover:bg-[#257373]"
          >
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
              Termin buchen
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
