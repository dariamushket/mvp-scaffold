import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { Session } from "@/types";
import { CreateSessionModal } from "./CreateSessionModal";

interface AdminSessionsPanelProps {
  leadId: string;
}

function statusLabel(status: Session["status"]): string {
  switch (status) {
    case "booking_open": return "Buchung offen";
    case "booked": return "Gebucht";
    case "completed": return "Abgeschlossen";
    case "canceled": return "Abgesagt";
  }
}

function statusColor(status: Session["status"]): string {
  switch (status) {
    case "booking_open": return "bg-amber-100 text-amber-700";
    case "booked": return "bg-teal-100 text-teal-700";
    case "completed": return "bg-green-100 text-green-700";
    case "canceled": return "bg-gray-100 text-gray-500";
  }
}

export async function AdminSessionsPanel({ leadId }: AdminSessionsPanelProps) {
  const { data: sessions } = await createAdminClient()
    .from("sessions")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const sessionList = (sessions ?? []) as Session[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sessions</CardTitle>
        <CreateSessionModal leadId={leadId} />
      </CardHeader>
      <CardContent>
        {sessionList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Sessions geplant.</p>
        ) : (
          <div className="space-y-3">
            {sessionList.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{session.title}</p>
                  {session.booked_start_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.booked_start_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(session.status)}`}
                >
                  {statusLabel(session.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
