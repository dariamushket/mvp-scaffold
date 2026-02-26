import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { Session } from "@/types";
import { AdminSessionsList } from "./AdminSessionsList";

interface AdminSessionsPanelProps {
  leadId: string;
  companyId: string;
}

export async function AdminSessionsPanel({ leadId, companyId }: AdminSessionsPanelProps) {
  const { data: sessions } = await createAdminClient()
    .from("sessions")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const sessionList = (sessions ?? []) as Session[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <AdminSessionsList
          sessions={sessionList}
          leadId={leadId}
          companyId={companyId}
        />
      </CardContent>
    </Card>
  );
}
