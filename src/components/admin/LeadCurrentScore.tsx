"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, ListTodo, Download } from "lucide-react";

interface LeadCurrentScoreProps {
  leadId: string;
  currentScore: number | null;
  tasksCompleted: number;
  sessionsCompleted: number;
  materialsDownloaded: number;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export function LeadCurrentScore({
  leadId,
  currentScore,
  tasksCompleted,
  sessionsCompleted,
  materialsDownloaded,
}: LeadCurrentScoreProps) {
  const [open, setOpen] = useState(true);
  const [score, setScore] = useState<number | "">(currentScore ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (score === "" || typeof score !== "number") return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch(`/api/leads/${leadId}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_score: score }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Fehler beim Speichern");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Aktueller Score</CardTitle>
            <span className={`text-2xl font-bold ${getScoreColor(typeof score === "number" ? score : null)}`}>
              {typeof score === "number" ? score : "—"}
            </span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-1 hover:bg-muted text-muted-foreground"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {/* Score editor */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d8a8a]/50"
              value={score}
              onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0–100"
            />
            <Button
              size="sm"
              className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
              onClick={handleSave}
              disabled={saving || score === ""}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Speichern"}
            </Button>
            {saved && <span className="text-xs text-green-600">Gespeichert</span>}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Sub-stats */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#2d8a8a] mb-1">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-[#0f2b3c]">{tasksCompleted}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Aufgaben erledigt</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#2d8a8a] mb-1">
                <ListTodo className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-[#0f2b3c]">{sessionsCompleted}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Sessions abgeschlossen</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#2d8a8a] mb-1">
                <Download className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-[#0f2b3c]">{materialsDownloaded}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Materialien heruntergeladen</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
