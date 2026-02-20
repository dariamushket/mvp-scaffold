"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Save } from "lucide-react";

interface SaveNotesProps {
  leadId: string;
  initialNotes: string;
}

export function SaveNotes({ leadId, initialNotes }: SaveNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/leads/${leadId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <textarea
        className="min-h-[120px] w-full rounded-lg border bg-transparent p-3 text-sm"
        placeholder="Add notes about this lead..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-600">Saved</span>}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save Notes"}
        </Button>
      </div>
    </>
  );
}
