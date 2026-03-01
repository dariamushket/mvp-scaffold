"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  total_score: number | null;
  typology_name: string | null;
  bottleneck_dimension: string | null;
  diagnostic_status: string | null;
  created_at: string;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground bg-muted";
  if (score >= 70) return "text-green-600 bg-green-50";
  if (score >= 40) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export function LeadsTableClient({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Lead wirklich löschen? Alle zugehörigen Aufgaben, Sessions und Materialien werden ebenfalls gelöscht.")) return;

    setDeletingId(id);
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
    setDeletingId(null);
  }

  return (
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
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => router.push(`/admin/leads/${lead.id}`)}
              className="border-b cursor-pointer transition-colors hover:bg-muted/50"
            >
              <td className="px-4 py-3">
                <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                <div className="text-sm text-muted-foreground">{lead.email}</div>
                {lead.company && (
                  <div className="text-sm text-muted-foreground">{lead.company}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-sm font-medium ${getScoreColor(lead.total_score)}`}>
                  {lead.total_score != null ? `${lead.total_score}/100` : "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{lead.typology_name ?? "—"}</td>
              <td className="px-4 py-3 text-sm">{lead.bottleneck_dimension ?? "—"}</td>
              <td className="px-4 py-3 text-sm capitalize">{lead.diagnostic_status ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(lead.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(e, lead.id)}
                  disabled={deletingId === lead.id}
                  className="text-destructive hover:text-destructive hover:bg-red-50"
                >
                  {deletingId === lead.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
