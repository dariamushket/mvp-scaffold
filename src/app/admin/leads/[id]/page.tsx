import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ArrowLeft, Download, Mail, Phone, Building2, Briefcase, Users, TrendingUp } from "lucide-react";
import { AdminMaterialsPanel } from "@/components/materials/AdminMaterialsPanel";
import { AdminSessionsPanel } from "@/components/admin/AdminSessionsPanel";
import { SaveNotes } from "@/components/admin/SaveNotes";
import { InviteButton } from "@/components/admin/InviteButton";
import { listMaterialsByCompany } from "@/lib/materials";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { DimensionScore } from "@/types";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
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

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const auth = await requireAdmin();
  if (!auth) redirect("/login");

  const { id } = await params;

  const { data: lead } = await createAdminClient()
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) redirect("/admin/leads");

  const companyId = lead.company_id as string;
  const materials = await listMaterialsByCompany(companyId);

  const dimensionScores: DimensionScore[] = Array.isArray(lead.dimension_scores)
    ? lead.dimension_scores
    : [];

  const fullName = `${lead.first_name} ${lead.last_name}`;

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
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

          {/* Assessment Results */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(lead.total_score)}`}>
                    {lead.total_score != null ? `${lead.total_score}/100` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">PSEI Score</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-lg font-semibold">{lead.typology_name ?? "—"}</div>
                  <div className="text-sm text-muted-foreground">Typology</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-lg font-semibold">{lead.bottleneck_dimension ?? "—"}</div>
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
                      const isBottleneck = lead.bottleneck_dimension === dim.name;
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
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <SaveNotes leadId={lead.id} initialNotes={lead.notes ?? ""} />
            </CardContent>
          </Card>

          {/* Sessions */}
          <AdminSessionsPanel leadId={lead.id} />

          {/* Materials */}
          <AdminMaterialsPanel companyId={companyId} initialMaterials={materials} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invite to Portal */}
          <Card>
            <CardHeader>
              <CardTitle>Portal Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Send a magic link to give this lead access to their portal dashboard, scorecard, and materials.
              </p>
              <InviteButton leadId={lead.id} />
            </CardContent>
          </Card>

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

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(lead.created_at).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
