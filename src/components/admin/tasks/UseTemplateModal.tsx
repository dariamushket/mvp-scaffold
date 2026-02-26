"use client";

import { useState, useEffect } from "react";
import { X, LayoutTemplate, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { TaskTemplate, TaskTag } from "@/types";

interface UseTemplateModalProps {
  companyId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function UseTemplateModal({ companyId, onSuccess, onClose }: UseTemplateModalProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/task-templates").then((r) => r.json()),
      fetch("/api/task-tags").then((r) => r.json()),
    ]).then(([t, g]) => {
      setTemplates(Array.isArray(t) ? t : []);
      setTags(Array.isArray(g) ? g : []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleApply(templateId: string) {
    setApplyingId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/task-templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Fehler beim Anwenden");
      }
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler beim Anwenden");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-[#2d8a8a]" />
            <h2 className="text-lg font-semibold text-[#0f2b3c]">Vorlage nutzen</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="mb-4 text-sm text-gray-500">
            Wählen Sie eine Vorlage. Alle enthaltenen Aufgaben werden sofort für diesen Lead erstellt.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Lade Vorlagen…</p>
          ) : templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Noch keine Vorlagen vorhanden.{" "}
              <a href="/admin/task-templates" className="text-[#2d8a8a] hover:underline">
                Jetzt eine erstellen →
              </a>
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {templates.map((template) => {
                const tag = tags.find((t) => t.id === template.tag_id) ?? template.tag;
                const taskCount = Array.isArray(template.payload) ? template.payload.length : 0;
                const isApplying = applyingId === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleApply(template.id)}
                    disabled={applyingId !== null}
                    className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:border-[#2d8a8a]/40 hover:bg-[#2d8a8a]/5 disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0f2b3c] truncate">{template.name}</span>
                        {tag && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {taskCount} {taskCount === 1 ? "Aufgabe" : "Aufgaben"}
                        {template.description && ` · ${template.description}`}
                      </p>
                    </div>
                    {isApplying ? (
                      <span className="ml-4 shrink-0 text-xs text-gray-400">Erstelle…</span>
                    ) : (
                      <ChevronRight className="ml-4 h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={applyingId !== null}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
