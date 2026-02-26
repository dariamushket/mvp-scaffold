"use client";

import { useState } from "react";
import { Plus, Copy, Send, Trash2 } from "lucide-react";
import { TaskTemplate, TaskTag } from "@/types";
import { TaskEditorModal } from "@/components/admin/tasks/TaskEditorModal";
import { AssignTemplateModal } from "@/components/admin/tasks/AssignTemplateModal";
import { DeleteTaskModal } from "@/components/admin/tasks/DeleteTaskModal";

interface TaskTemplatesClientProps {
  initialTemplates: TaskTemplate[];
  tags: TaskTag[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TaskTemplatesClient({ initialTemplates, tags }: TaskTemplatesClientProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTemplates);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TaskTemplate | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<TaskTemplate | null>(null);

  async function handleDuplicate(template: TaskTemplate) {
    const res = await fetch(`/api/task-templates/${template.id}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      const copy: TaskTemplate = await res.json();
      setTemplates((prev) => [copy, ...prev]);
    }
  }

  async function handleDelete() {
    if (!deletingTemplate) return;
    const res = await fetch(`/api/task-templates/${deletingTemplate.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
    }
    setDeletingTemplate(null);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878]"
        >
          <Plus className="h-4 w-4" />
          Neue Vorlage
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Tag</th>
              <th className="px-5 py-3">Aufgaben</th>
              <th className="px-5 py-3">Zuletzt genutzt</th>
              <th className="px-5 py-3">Erstellt</th>
              <th className="px-5 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  Noch keine Vorlagen vorhanden
                </td>
              </tr>
            )}
            {templates.map((template) => {
              const tag = tags.find((t) => t.id === template.tag_id) ?? template.tag;
              const taskCount = Array.isArray(template.payload) ? template.payload.length : 0;

              return (
                <tr key={template.id} className="border-b transition-colors hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="font-medium text-[#0f2b3c] hover:text-[#2d8a8a] hover:underline text-left"
                    >
                      {template.name}
                    </button>
                    {template.description && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                        {template.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {tag ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{taskCount}</td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(template.last_used_at)}</td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(template.created_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setAssigningTemplate(template)}
                        title="Zuweisen"
                        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-[#2d8a8a]"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Zuweisen
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        title="Duplizieren"
                        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplizieren
                      </button>
                      <button
                        onClick={() => setDeletingTemplate(template)}
                        title="Löschen"
                        className="rounded-lg border px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <TaskEditorModal
          mode="template"
          tags={tags}
          onSave={(saved) => {
            setTemplates((prev) => [saved, ...prev]);
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <TaskEditorModal
          mode="template"
          tags={tags}
          initialTemplate={editingTemplate}
          onSave={(saved) => {
            setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
            setEditingTemplate(null);
          }}
          onDelete={(templateId) => {
            setEditingTemplate(null);
            setDeletingTemplate(templates.find((t) => t.id === templateId) ?? null);
          }}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Assign modal */}
      {assigningTemplate && (
        <AssignTemplateModal
          templateId={assigningTemplate.id}
          templateName={assigningTemplate.name}
          onSuccess={() => setAssigningTemplate(null)}
          onClose={() => setAssigningTemplate(null)}
        />
      )}

      {/* Delete modal */}
      {deletingTemplate && (
        <DeleteTaskModal
          taskTitle={deletingTemplate.name}
          onConfirm={handleDelete}
          onClose={() => setDeletingTemplate(null)}
        />
      )}
    </div>
  );
}
