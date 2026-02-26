"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
}

interface AssignTemplateModalProps {
  templateId: string;
  templateName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AssignTemplateModal({
  templateId,
  templateName,
  onSuccess,
  onClose,
}: AssignTemplateModalProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoadingLeads(false));
  }, []);

  async function handleAssign() {
    if (!selectedLeadId) {
      setError("Bitte ein Unternehmen auswählen");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/task-templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: selectedLeadId }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Fehler beim Zuweisen");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler beim Zuweisen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-[#0f2b3c]">Vorlage zuweisen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Vorlage <span className="font-medium">&bdquo;{templateName}&ldquo;</span> einem Unternehmen zuweisen.
          Alle Aufgaben aus der Vorlage werden erstellt.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Vorlage erfolgreich zugewiesen!
          </div>
        )}

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Unternehmen / Lead</label>
          {loadingLeads ? (
            <p className="text-sm text-gray-500">Lade Unternehmen…</p>
          ) : (
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
            >
              <option value="">Unternehmen wählen…</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.company} ({lead.first_name} {lead.last_name})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedLeadId}
            className="rounded-md bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-60"
          >
            {loading ? "Zuweisen…" : "Zuweisen"}
          </button>
        </div>
      </div>
    </div>
  );
}
