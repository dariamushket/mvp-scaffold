import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent } from "@/components/ui";
import { Download, Eye, MoreHorizontal } from "lucide-react";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground bg-muted";
  if (score >= 70) return "text-green-600 bg-green-50";
  if (score >= 40) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default async function LeadsPage() {
  const auth = await requireAdmin();
  if (!auth) redirect("/login");

  const { data: leads } = await createAdminClient()
    .from("leads")
    .select("id, first_name, last_name, email, company, total_score, typology_name, bottleneck_dimension, diagnostic_status, created_at")
    .order("created_at", { ascending: false });

  const rows = leads ?? [];

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Manage and track assessment leads"
      >
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              No leads yet. Completed assessments will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Lead</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Typology</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Bottleneck</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead) => (
                    <tr key={lead.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{lead.email}</div>
                          {lead.company && (
                            <div className="text-sm text-muted-foreground">{lead.company}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-sm font-medium ${getScoreColor(lead.total_score)}`}
                        >
                          {lead.total_score != null ? `${lead.total_score}/100` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{lead.typology_name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{lead.bottleneck_dimension ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm capitalize">{lead.diagnostic_status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/leads/${lead.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {rows.length} lead{rows.length !== 1 ? "s" : ""} total
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
