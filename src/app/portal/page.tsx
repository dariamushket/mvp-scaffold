import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { Calendar, MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DimensionScore, LeadProduct, Session, Task, TaskTag } from "@/types";

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
  const day = startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  const startTime = startDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (end) {
    const endTime = new Date(end).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${startTime}–${endTime} Uhr`;
  }
  return `${day} · ${startTime} Uhr`;
}

function formatDeadline(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function daysOverdue(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
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
  let hasBooked = false;
  let allTasks: Task[] = [];
  let tags: TaskTag[] = [];
  let leadProducts: LeadProduct[] = [];

  if (profile.company_id) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const [leadRes, sessionsRes, tasksRes, tagsRes, leadProductsRes] = await Promise.all([
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
      supabase
        .from("tasks")
        .select("*")
        .eq("company_id", profile.company_id),
      supabase
        .from("task_tags")
        .select("*"),
      adminSupabase
        .from("lead_products")
        .select("*, product_template:product_templates(*, tag:task_tags(*))")
        .eq("lead_id", profile.company_id)
        .order("created_at", { ascending: false }),
    ]);

    lead = leadRes.data;
    allTasks = (tasksRes.data ?? []) as Task[];
    tags = (tagsRes.data ?? []) as TaskTag[];
    leadProducts = (leadProductsRes.data ?? []) as LeadProduct[];

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
    hasBooked = firstUpcoming !== null;
  }

  const userName = lead?.first_name ?? "there";
  const score = lead?.total_score ?? null;
  const scoreLabel = score != null ? getStatusLabel(score, 100) : "—";
  const dimensionScores: DimensionScore[] = Array.isArray(lead?.dimension_scores)
    ? (lead!.dimension_scores as DimensionScore[])
    : [];

  // Task stats
  const totalTasks = allTasks.length;
  const openTasks = allTasks.filter((t) => t.status !== "done");
  const doneTasks = allTasks.filter((t) => t.status === "done");
  const openCount = openTasks.length;
  const doneCount = doneTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = allTasks.filter(
    (t) =>
      t.status !== "done" &&
      t.deadline &&
      new Date(t.deadline) < today
  );

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
        ) : hasBooked ? (
          <Button asChild variant="outline">
            <Link href="/portal/sessions">Sessions ansehen</Link>
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
        <Link href="/portal/scorecard" className="block">
          <Card className="h-full rounded-xl border shadow-sm transition-colors hover:border-[#2d8a8a]/40">
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
        </Link>

        {/* Open Tasks Card */}
        <Link href="/portal/tasks" className="block">
          <Card className="h-full rounded-xl border shadow-sm transition-colors hover:border-[#2d8a8a]/40">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-[#0f2b3c]">Offene Aufgaben</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-[#0f2b3c]">
                  {openCount}
                </span>
                <span className="text-xl text-muted-foreground">/ {totalTasks}</span>
              </div>
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#2d8a8a] transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{doneCount} erledigt</p>
              </div>
            </CardContent>
          </Card>
        </Link>

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
                <div className="mt-4 flex gap-2">
                  <a
                    href={`${nextSession.calendly_url}?utm_content=${nextSession.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full bg-[#0f2b3c] text-white hover:bg-[#1a3d54]">
                      Termin buchen
                    </Button>
                  </a>
                  <Link href="/portal/sessions" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      Details
                    </Button>
                  </Link>
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
                      <Button size="sm" className="w-full bg-[#2d8a8a] text-white hover:bg-[#257373]">
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

      {/* Meine Produkte */}
      {leadProducts.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-[#0f2b3c]">Meine Produkte</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {leadProducts.map((lp) => {
              const template = lp.product_template;
              if (!template) return null;

              if (lp.status === "announced") {
                return (
                  <div
                    key={lp.id}
                    className="flex items-start gap-4 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 p-5 shadow-sm text-white"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <CalendarDays className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{template.name}</p>
                      {template.description && (
                        <p className="mt-1 text-sm text-white/80">{template.description}</p>
                      )}
                      <a
                        href={FALLBACK_BOOKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-white/90"
                      >
                        Jetzt buchen
                      </a>
                    </div>
                  </div>
                );
              }

              if (lp.status === "activated") {
                return (
                  <div
                    key={lp.id}
                    className="flex items-start gap-4 rounded-xl border bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#0f2b3c]">{template.name}</p>
                      {template.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <Link
                        href="/portal/materials"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Materialien ansehen →
                      </Link>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* Dimensions Overview */}
      {dimensionScores.length > 0 && (
        <div className="mb-8">
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

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold text-[#0f2b3c]">
                Überfällige Aufgaben
              </h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                {overdueTasks.length}
              </span>
            </div>
            <Link
              href="/portal/tasks"
              className="text-sm font-medium text-[#2d8a8a] hover:underline"
            >
              Alle anzeigen →
            </Link>
          </div>

          <div className="space-y-2">
            {overdueTasks.map((task) => {
              const tag = tags.find((t) => t.id === task.tag_id);
              const days = daysOverdue(task.deadline!);
              return (
                <Link key={task.id} href="/portal/tasks">
                  <div className="flex items-center justify-between rounded-xl border bg-white px-5 py-4 transition-colors hover:border-red-200 hover:bg-red-50/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-[#0f2b3c] truncate">{task.title}</span>
                      {tag && (
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      )}
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-medium text-red-600">
                        Fällig: {formatDeadline(task.deadline!)}
                      </p>
                      <p className="text-xs text-red-500">
                        {days} {days === 1 ? "Tag" : "Tage"} überfällig
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
