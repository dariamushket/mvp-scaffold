import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { Calendar, BarChart2, MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/server";
import { DimensionScore, Session } from "@/types";

const FALLBACK_BOOKING_URL = "https://calendly.com/tcinar/psei";

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

function formatSessionTime(start: string, end: string | null): string {
  const startDate = new Date(start);
  const day = startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const startTime = startDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (end) {
    const endTime = new Date(end).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${startTime}–${endTime} Uhr`;
  }
  return `${day} · ${startTime} Uhr`;
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

  let nextSession: Session | null = null;
  let hasBookingOpen = false;

  if (profile.company_id) {
    const supabase = await createClient();

    const [leadRes, sessionsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("first_name, total_score, typology_name, bottleneck_dimension, dimension_scores")
        .eq("id", profile.company_id)
        .single(),
      supabase
        .from("sessions")
        .select("*")
        .eq("lead_id", profile.company_id)
        .eq("show_on_dashboard", true)
        .order("created_at", { ascending: true }),
    ]);

    lead = leadRes.data;

    const sessions = (sessionsRes.data ?? []) as Session[];
    const now = new Date();

    const firstBookingOpen = sessions.find((s) => s.status === "booking_open") ?? null;
    const firstUpcoming =
      sessions.find(
        (s) =>
          s.status === "booked" &&
          s.booked_start_at &&
          new Date(s.booked_start_at) > now
      ) ?? null;

    nextSession = firstBookingOpen ?? firstUpcoming;
    hasBookingOpen = firstBookingOpen !== null;
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
        {hasBookingOpen && nextSession ? (
          <Button asChild className="bg-[#2d8a8a] text-white hover:bg-[#257373]">
            <a
              href={`${nextSession.calendly_url}?utm_content=${nextSession.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Session buchen
            </a>
          </Button>
        ) : (
          <Button asChild className="bg-[#2d8a8a] text-white hover:bg-[#257373]">
            <a href={FALLBACK_BOOKING_URL} target="_blank" rel="noopener noreferrer">
              Strategiegespräch buchen
            </a>
          </Button>
        )}
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

            {!nextSession && (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#0f2b3c]" />
                  <span className="text-2xl font-bold text-[#0f2b3c]">Buchen</span>
                </div>
                <div className="mt-4">
                  <a href={FALLBACK_BOOKING_URL} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="w-full">
                      Termin wählen
                    </Button>
                  </a>
                </div>
              </>
            )}

            {nextSession?.status === "booking_open" && (
              <>
                <div className="mt-2">
                  <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Buchung offen
                  </span>
                  <p className="mt-1 font-semibold text-[#0f2b3c]">{nextSession.title}</p>
                </div>
                <div className="mt-4">
                  <a
                    href={`${nextSession.calendly_url}?utm_content=${nextSession.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      className="w-full bg-[#0f2b3c] text-white hover:bg-[#1a3d54]"
                    >
                      Termin buchen
                    </Button>
                  </a>
                </div>
              </>
            )}

            {nextSession?.status === "booked" && (
              <>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#2d8a8a]" />
                    <span className="text-sm font-medium text-[#0f2b3c]">
                      {nextSession.booked_start_at
                        ? formatSessionTime(nextSession.booked_start_at, nextSession.booked_end_at)
                        : "—"}
                    </span>
                  </div>
                  {nextSession.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{nextSession.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href="/portal/sessions" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      Details
                    </Button>
                  </Link>
                  {nextSession.meeting_url && (
                    <a href={nextSession.meeting_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button
                        size="sm"
                        className="w-full bg-[#2d8a8a] text-white hover:bg-[#257373]"
                      >
                        Beitreten
                      </Button>
                    </a>
                  )}
                </div>
              </>
            )}
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
          {hasBookingOpen && nextSession ? (
            <Button asChild className="shrink-0 bg-[#2d8a8a] text-white hover:bg-[#257373]">
              <a
                href={`${nextSession.calendly_url}?utm_content=${nextSession.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Termin buchen
              </a>
            </Button>
          ) : (
            <Button asChild className="shrink-0 bg-[#2d8a8a] text-white hover:bg-[#257373]">
              <a href={FALLBACK_BOOKING_URL} target="_blank" rel="noopener noreferrer">
                Termin buchen
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
