import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { LeadsTableClient } from "./LeadsTableClient";

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
      <PageHeader title="Leads" description="Manage and track assessment leads" />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              No leads yet. Completed assessments will appear here.
            </div>
          ) : (
            <LeadsTableClient initialLeads={rows} />
          )}
          <div className="flex items-center border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {rows.length} lead{rows.length !== 1 ? "s" : ""} total
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
