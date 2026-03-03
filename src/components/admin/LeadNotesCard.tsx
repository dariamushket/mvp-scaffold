"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { LeadNote } from "@/types";

interface LeadNotesCardProps {
  leadId: string;
  initialNotes: LeadNote[];
}

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadNotesCard({ leadId, initialNotes }: LeadNotesCardProps) {
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Fehler beim Speichern");
        return;
      }

      setNotes([body.note, ...notes]);
      setContent("");
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notizen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing notes */}
        {notes.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="whitespace-pre-wrap text-[#0f2b3c]">{note.content}</p>
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.admin_email}</span>
                  <span>{formatNoteDate(note.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {notes.length === 0 && (
          <p className="text-xs text-muted-foreground">Noch keine Notizen vorhanden.</p>
        )}

        {/* New note */}
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2d8a8a]/50 resize-none"
            rows={3}
            placeholder="Neue Notiz eingeben..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            className="w-full bg-[#2d8a8a] text-white hover:bg-[#257373]"
            onClick={handleSave}
            disabled={saving || !content.trim()}
          >
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
