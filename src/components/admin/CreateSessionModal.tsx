"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

interface CreateSessionModalProps {
  leadId: string;
}

export function CreateSessionModal({ leadId }: CreateSessionModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [showOnDashboard, setShowOnDashboard] = useState(true);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCalendlyUrl("");
    setShowOnDashboard(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          calendly_url: calendlyUrl,
          show_on_dashboard: showOnDashboard,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Fehler beim Erstellen der Session");
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        size="sm"
        className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
        onClick={() => setOpen(true)}
      >
        Session planen
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
          Session planen
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-title">
              Titel <span className="text-red-500">*</span>
            </Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Strategiegespräch"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-description">Beschreibung</Label>
            <textarea
              id="session-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung der Session"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-url">
              Buchungslink <span className="text-red-500">*</span>
            </Label>
            <Input
              id="session-url"
              type="url"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/..."
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="session-dashboard"
              type="checkbox"
              checked={showOnDashboard}
              onChange={(e) => setShowOnDashboard(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#2d8a8a]"
            />
            <Label htmlFor="session-dashboard" className="cursor-pointer">
              Auf Nutzer-Dashboard anzeigen
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#2d8a8a] text-white hover:bg-[#257373]"
              disabled={loading}
            >
              {loading ? "Wird erstellt…" : "Session erstellen"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
