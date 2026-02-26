"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Pencil } from "lucide-react";
import { Session } from "@/types";
import { SessionEditorModal } from "./SessionEditorModal";

interface AdminSessionsListProps {
  sessions: Session[];
  leadId: string;
  companyId: string;
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

export function AdminSessionsList({ sessions, leadId, companyId }: AdminSessionsListProps) {
  const router = useRouter();
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function handleSaved() {
    router.refresh();
  }

  function handleDeleted() {
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span />
        <Button
          size="sm"
          className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
          onClick={() => setShowCreate(true)}
        >
          Session planen
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Sessions geplant.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
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
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(session.status)}`}
                >
                  {statusLabel(session.status)}
                </span>
                <button
                  onClick={() => setEditingSession(session)}
                  className="rounded p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                  title="Session bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <SessionEditorModal
          leadId={leadId}
          companyId={companyId}
          onSaved={handleSaved}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingSession && (
        <SessionEditorModal
          leadId={leadId}
          companyId={companyId}
          session={editingSession}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditingSession(null)}
        />
      )}
    </>
  );
}
