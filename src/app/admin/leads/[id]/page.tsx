import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ArrowLeft, Download, Mail, Phone, Building2, Briefcase, Users, TrendingUp, CheckCircle2, CalendarCheck, FileDown } from "lucide-react";
import { AdminMaterialsPanel } from "@/components/materials/AdminMaterialsPanel";
import { AdminSessionsPanel } from "@/components/admin/AdminSessionsPanel";
import { AdminTasksTab } from "@/components/admin/tasks/AdminTasksTab";
import { AdminLeadProductsTab } from "@/components/admin/AdminLeadProductsTab";
import { LeadTabNav } from "@/components/admin/LeadTabNav";
import { PortalAccessCard } from "@/components/admin/PortalAccessCard";
import { LeadNotesCard } from "@/components/admin/LeadNotesCard";
import { LeadCurrentScore } from "@/components/admin/LeadCurrentScore";
import { AssessmentResultsCard } from "@/components/admin/AssessmentResultsCard";
import { listMaterialsByCompany } from "@/lib/materials";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { DimensionScore, LeadNote, LeadProduct, ProductTemplate } from "@/types";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

type TabId = "overview" | "tasks" | "materials" | "products";

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const auth = await requireAdmin();
  if (!auth) redirect("/login");

  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: TabId =
    tab === "tasks" || tab === "materials" || tab === "products" ? tab : "overview";

  const { data: lead } = await createAdminClient()
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) redirect("/admin/leads");

  const companyId = lead.id;
  const materials = await listMaterialsByCompany(companyId);

  const adminClient = createAdminClient();

  // Fetch task IDs once — used for both badge queries and activity feed
  const { data: taskIdsData } = await adminClient
    .from("tasks").select("id").eq("company_id", companyId);
  const taskIdList = (taskIdsData ?? []).map((t: { id: string }) => t.id);

  // ── Tab badge data (always fetch, lightweight) ──────────────────────────
  const [badgeCommentRes, badgeDoneRes, badgeMaterialRes] = await Promise.all([
    taskIdList.length > 0
      ? adminClient.from("task_comments")
          .select("created_at, author_id")
          .in("task_id", taskIdList)
          .order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as { created_at: string; author_id: string }[] }),
    adminClient.from("tasks")
      .select("updated_at")
      .eq("company_id", companyId).eq("status", "done")
      .order("updated_at", { ascending: false }).limit(1),
    adminClient.from("materials")
      .select("created_at, uploaded_by")
      .eq("company_id", companyId).eq("is_placeholder", false)
      .order("created_at", { ascending: false }).limit(50),
  ]);

  // Resolve roles for comment authors and material uploaders
  const badgeUserIds = Array.from(new Set([
    ...(badgeCommentRes.data ?? []).map((c: { author_id: string }) => c.author_id),
    ...(badgeMaterialRes.data ?? []).map((m: { uploaded_by: string }) => m.uploaded_by),
  ].filter(Boolean))) as string[];
  const badgeRoleMap: Record<string, string> = {};
  if (badgeUserIds.length > 0) {
    const { data: profileRows } = await adminClient.from("profiles").select("id, role").in("id", badgeUserIds);
    (profileRows ?? []).forEach((p: { id: string; role: string }) => { badgeRoleMap[p.id] = p.role; });
  }

  const latestCustomerComment = (badgeCommentRes.data ?? []).find(
    (c: { author_id: string }) => badgeRoleMap[c.author_id] === 'customer'
  );
  const latestDoneTask = (badgeDoneRes.data ?? [])[0] as { updated_at: string } | undefined;
  const latestCustomerMat = (badgeMaterialRes.data ?? []).find(
    (m: { uploaded_by: string }) => badgeRoleMap[m.uploaded_by] === 'customer'
  );

  const tasksTabLatest = [
    latestCustomerComment ? (latestCustomerComment.created_at as string) : null,
    latestDoneTask?.updated_at ?? null,
  ].filter((t): t is string => !!t).sort().reverse()[0] ?? null;

  const tabLatestAt: Partial<Record<TabId, string | null>> = {
    tasks: tasksTabLatest,
    materials: latestCustomerMat ? (latestCustomerMat.created_at as string) : null,
  };

  // ── Overview tab extra data ──────────────────────────────────────────────
  type ActivityEvent = { id: string; type: 'comment' | 'task_done' | 'material'; label: string; timestamp: string };
  let events: ActivityEvent[] = [];
  let tasksCompleted = 0;
  let sessionsCompleted = 0;
  let materialsDownloaded = 0;
  let isPortalActivated = false;
  let leadNotes: LeadNote[] = [];

  if (activeTab === "overview") {
    type CommentRow = { id: string; body: string; created_at: string; author_id: string };
    type DoneTaskRow = { id: string; title: string; updated_at: string };
    type MaterialRow = { id: string; title: string; type: string; created_at: string; uploaded_by: string };

    const [
      commentsRes,
      doneTasksRes,
      materialsRes,
      tasksCountRes,
      sessionsCountRes,
      matDownloadsRes,
      customerProfileRes,
      leadNotesRes,
    ] = await Promise.all([
      taskIdList.length > 0
        ? adminClient.from("task_comments")
            .select("id, body, created_at, author_id")
            .in("task_id", taskIdList).order("created_at", { ascending: false }).limit(10)
        : Promise.resolve({ data: [] as CommentRow[] }),
      adminClient.from("tasks")
        .select("id, title, updated_at")
        .eq("company_id", companyId).eq("status", "done")
        .order("updated_at", { ascending: false }).limit(5),
      adminClient.from("materials")
        .select("id, title, type, created_at, uploaded_by")
        .eq("company_id", companyId).eq("is_placeholder", false)
        .order("created_at", { ascending: false }).limit(10),
      adminClient.from("tasks").select("*", { count: "exact", head: true })
        .eq("company_id", companyId).eq("status", "done"),
      adminClient.from("sessions").select("*", { count: "exact", head: true })
        .eq("lead_id", id).eq("status", "completed"),
      adminClient.from("materials").select("download_count")
        .eq("company_id", companyId).eq("is_placeholder", false),
      adminClient.from("profiles").select("id")
        .eq("company_id", companyId).eq("role", "customer").maybeSingle(),
      adminClient.from("lead_notes").select("*")
        .eq("lead_id", id).order("created_at", { ascending: false }),
    ]);

    tasksCompleted = tasksCountRes.count ?? 0;
    sessionsCompleted = sessionsCountRes.count ?? 0;
    materialsDownloaded = (matDownloadsRes.data ?? []).reduce(
      (s: number, m: { download_count: number | null }) => s + (m.download_count ?? 0), 0
    );
    isPortalActivated = !!customerProfileRes.data;
    leadNotes = (leadNotesRes.data ?? []) as LeadNote[];

    // Resolve user roles for activity feed
    const activityUserIds = Array.from(new Set([
      ...(commentsRes.data ?? []).map((c: CommentRow) => c.author_id),
      ...(materialsRes.data ?? []).map((m: MaterialRow) => m.uploaded_by),
    ].filter(Boolean))) as string[];
    const activityRoleMap: Record<string, string> = {};
    if (activityUserIds.length > 0) {
      const { data: profileRows } = await adminClient.from("profiles").select("id, role").in("id", activityUserIds);
      (profileRows ?? []).forEach((p: { id: string; role: string }) => { activityRoleMap[p.id] = p.role; });
    }

    events = [
      ...(commentsRes.data ?? [] as CommentRow[])
        .filter((c: CommentRow) => activityRoleMap[c.author_id] === 'customer')
        .map((c: CommentRow) => ({
          id: c.id,
          type: 'comment' as const,
          label: `Kommentar: "${c.body.slice(0, 60)}${c.body.length > 60 ? '…' : ''}"`,
          timestamp: c.created_at,
        })),
      ...(doneTasksRes.data ?? [] as DoneTaskRow[]).map((t: DoneTaskRow) => ({
        id: t.id,
        type: 'task_done' as const,
        label: `Aufgabe erledigt: ${t.title}`,
        timestamp: t.updated_at,
      })),
      ...(materialsRes.data ?? [] as MaterialRow[])
        .filter((m: MaterialRow) => activityRoleMap[m.uploaded_by] === 'customer')
        .map((m: MaterialRow) => ({
          id: m.id,
          type: 'material' as const,
          label: `Material hochgeladen: ${m.title}`,
          timestamp: m.created_at,
        })),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
  }

  const [leadProductsResult, allProductsResult] = await Promise.all([
    createAdminClient()
      .from("lead_products")
      .select("*, product_template:product_templates(*, tag:task_tags(*))")
      .eq("lead_id", id),
    createAdminClient()
      .from("product_templates")
      .select("*")
      .eq("status", "active"),
  ]);

  const leadProducts: LeadProduct[] = (leadProductsResult.data ?? []) as LeadProduct[];
  const allProducts: ProductTemplate[] = (allProductsResult.data ?? []) as ProductTemplate[];

  const dimensionScores: DimensionScore[] = Array.isArray(lead.dimension_scores)
    ? lead.dimension_scores
    : [];

  const fullName = `${lead.first_name} ${lead.last_name}`;

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Übersicht" },
    { id: "tasks", label: "Aufgaben" },
    { id: "materials", label: "Materialien" },
    { id: "products", label: "Produkte" },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/leads"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leads
        </Link>
      </div>

      <PageHeader title={fullName} description={`Lead ID: ${lead.id}`}>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      {/* Tab navigation with activity badges */}
      <LeadTabNav
        leadId={id}
        activeTab={activeTab}
        tabs={tabs}
        tabLatestAt={tabLatestAt}
      />

      {/* Übersicht tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <a href={`mailto:${lead.email}`} className="font-medium hover:underline">
                      {lead.email}
                    </a>
                  </div>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <a href={`tel:${lead.phone}`} className="font-medium hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Company</div>
                      <div className="font-medium">{lead.company}</div>
                    </div>
                  </div>
                )}
                {lead.position && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Position</div>
                      <div className="font-medium">{lead.position}</div>
                    </div>
                  </div>
                )}
                {lead.employee_count && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Employees</div>
                      <div className="font-medium">{lead.employee_count}</div>
                    </div>
                  </div>
                )}
                {lead.annual_revenue && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Annual Revenue</div>
                      <div className="font-medium">{lead.annual_revenue}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
                <div className="flex items-center justify-center mb-2 text-[#2d8a8a]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-[#0f2b3c]">{tasksCompleted}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Aufgaben erledigt</div>
              </div>
              <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
                <div className="flex items-center justify-center mb-2 text-[#2d8a8a]">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-[#0f2b3c]">{sessionsCompleted}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sessions abgeschlossen</div>
              </div>
              <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
                <div className="flex items-center justify-center mb-2 text-[#2d8a8a]">
                  <FileDown className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-[#0f2b3c]">{materialsDownloaded}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Materialien heruntergeladen</div>
              </div>
            </div>

            {/* Current Score */}
            <LeadCurrentScore
              leadId={id}
              currentScore={lead.current_score ?? null}
              tasksCompleted={tasksCompleted}
              sessionsCompleted={sessionsCompleted}
              materialsDownloaded={materialsDownloaded}
            />

            {/* Assessment Results (collapsible) */}
            <AssessmentResultsCard
              totalScore={lead.total_score ?? null}
              typologyName={lead.typology_name ?? null}
              bottleneckDimension={lead.bottleneck_dimension ?? null}
              dimensionScores={dimensionScores}
            />

            {/* Sessions */}
            <AdminSessionsPanel leadId={lead.id} companyId={companyId} />
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Portal Access */}
            <PortalAccessCard
              leadId={id}
              inviteSharedAt={lead.portal_invite_shared_at ?? null}
              isActivated={isPortalActivated}
            />

            {/* Notes */}
            <LeadNotesCard leadId={id} initialNotes={leadNotes} />

            {/* Diagnostic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{lead.diagnostic_status ?? "—"}</span>
                </div>
                {lead.diagnostic_started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{new Date(lead.diagnostic_started_at).toLocaleString()}</span>
                  </div>
                )}
                {lead.diagnostic_completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{new Date(lead.diagnostic_completed_at).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader><CardTitle>Aktivitäten</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Keine Aktivitäten.</p>
                ) : events.map((ev) => (
                  <div key={ev.id + ev.type} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">
                      {ev.type === 'comment' ? '💬' : ev.type === 'task_done' ? '✅' : '📄'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs leading-snug text-[#0f2b3c]">{ev.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Aufgaben tab */}
      {activeTab === "tasks" && (
        <AdminTasksTab companyId={lead.id} currentUserId={auth.user.id} />
      )}

      {/* Materialien tab */}
      {activeTab === "materials" && (
        <AdminMaterialsPanel companyId={companyId} initialMaterials={materials} />
      )}

      {/* Produkte tab */}
      {activeTab === "products" && (
        <AdminLeadProductsTab
          leadId={lead.id}
          leadProducts={leadProducts}
          allProducts={allProducts}
        />
      )}
    </div>
  );
}
