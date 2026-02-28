"use client";

import { useState } from "react";
import {
  Plus, Pencil, Archive, X, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { ProductTemplate, ProductTemplatePayload, ProductTemplateStatus, TaskTag, MaterialType } from "@/types";
import { TagSelect } from "@/components/ui/TagSelect";

interface ProductTemplatesClientProps {
  initialTemplates: ProductTemplate[];
  tags: TaskTag[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: ProductTemplateStatus }) {
  const map: Record<ProductTemplateStatus, { label: string; className: string }> = {
    draft: { label: "Entwurf", className: "bg-gray-100 text-gray-600" },
    active: { label: "Aktiv", className: "bg-green-100 text-green-700" },
    archived: { label: "Archiviert", className: "bg-amber-100 text-amber-700" },
  };
  const { label, className } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: "product", label: "Produkt" },
  { value: "document", label: "Dokument" },
  { value: "scorecard", label: "Scorecard" },
  { value: "meeting_notes", label: "Meeting Notes" },
];

interface DrawerProps {
  template: ProductTemplate | null;
  tags: TaskTag[];
  onSave: (t: ProductTemplate) => void;
  onClose: () => void;
}

function ProductTemplateDrawer({ template, tags, onSave, onClose }: DrawerProps) {
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [tagId, setTagId] = useState<string | null>(template?.tag_id ?? null);
  const [status, setStatus] = useState<ProductTemplateStatus>(template?.status ?? "draft");
  const [localTags, setLocalTags] = useState<TaskTag[]>(tags);

  const initPayload = template?.payload ?? { tasks: [], sessions: [], materials: [] };
  const [tasks, setTasks] = useState(
    (initPayload.tasks ?? []).map((t) => ({
      title: t.title,
      description: t.description ?? "",
      deadline_offset_days: t.deadline_offset_days ?? undefined as number | undefined,
      subtasks: (t.subtasks ?? []).map((s) => ({
        title: s.title,
        deadline_offset_days: s.deadline_offset_days ?? undefined as number | undefined,
      })),
    }))
  );
  const [sessions, setSessions] = useState(
    (initPayload.sessions ?? []).map((s) => ({
      title: s.title,
      description: s.description ?? "",
      calendly_url: s.calendly_url ?? "",
      show_on_dashboard: s.show_on_dashboard ?? false,
    }))
  );
  const [materials, setMaterials] = useState(
    (initPayload.materials ?? []).map((m) => ({
      title: m.title,
      description: m.description ?? "",
      type: (m.type ?? "product") as MaterialType,
    }))
  );

  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTask(i: number) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name ist erforderlich"); return; }
    setSaving(true);
    setError(null);

    const payload: ProductTemplatePayload = {
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description || undefined,
        deadline_offset_days: t.deadline_offset_days,
        subtasks: t.subtasks.map((s) => ({
          title: s.title,
          deadline_offset_days: s.deadline_offset_days,
        })),
      })),
      sessions: sessions.map((s) => ({
        title: s.title,
        description: s.description || undefined,
        calendly_url: s.calendly_url || undefined,
        show_on_dashboard: s.show_on_dashboard,
      })),
      materials: materials.map((m) => ({
        title: m.title,
        description: m.description || undefined,
        type: m.type,
      })),
    };

    try {
      const url = isEdit ? `/api/product-templates/${template!.id}` : "/api/product-templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description || null, tag_id: tagId, status, payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onSave(data as ProductTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0f2b3c]">
            {isEdit ? "Produktvorlage bearbeiten" : "Neue Produktvorlage"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

          {/* Basic fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Strategie-Paket"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Beschreibung</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Kurze Beschreibung des Produkts…"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tag</label>
                <TagSelect
                  tags={localTags}
                  value={tagId}
                  onChange={setTagId}
                  onTagCreated={(t) => setLocalTags((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))}
                  placeholder="Tag wählen…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductTemplateStatus)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
                >
                  <option value="draft">Entwurf</option>
                  <option value="active">Aktiv</option>
                  <option value="archived">Archiviert</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tasks section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Aufgaben ({tasks.length})</h3>
              <button
                onClick={() => setTasks((prev) => [...prev, { title: "", description: "", deadline_offset_days: undefined, subtasks: [] }])}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" /> Aufgabe
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div key={i} className="rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button onClick={() => toggleTask(i)} className="text-gray-400 hover:text-gray-600">
                      {expandedTasks.has(i) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, title: e.target.value } : t))}
                      placeholder="Aufgabentitel"
                      className="flex-1 rounded border-0 bg-transparent text-sm outline-none"
                    />
                    <button onClick={() => setTasks((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {expandedTasks.has(i) && (
                    <div className="border-t px-3 py-3 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Beschreibung</label>
                        <input
                          type="text"
                          value={task.description}
                          onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, description: e.target.value } : t))}
                          placeholder="Optionale Beschreibung"
                          className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Fälligkeit (Tage ab Aktivierung)</label>
                        <input
                          type="number"
                          value={task.deadline_offset_days ?? ""}
                          onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, deadline_offset_days: e.target.value ? Number(e.target.value) : undefined } : t))}
                          placeholder="z. B. 14"
                          className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                        />
                      </div>
                      {/* Subtasks */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-xs text-gray-500">Teilaufgaben</label>
                          <button
                            onClick={() => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, subtasks: [...t.subtasks, { title: "", deadline_offset_days: undefined }] } : t))}
                            className="text-xs text-[#2d8a8a] hover:underline"
                          >
                            + Teilaufgabe
                          </button>
                        </div>
                        <div className="space-y-1">
                          {task.subtasks.map((sub, k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs">—</span>
                              <input
                                type="text"
                                value={sub.title}
                                onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? {
                                  ...t,
                                  subtasks: t.subtasks.map((s, l) => l === k ? { ...s, title: e.target.value } : s)
                                } : t))}
                                placeholder="Teilaufgabe"
                                className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                              />
                              <button onClick={() => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, subtasks: t.subtasks.filter((_, l) => l !== k) } : t))} className="text-gray-400 hover:text-red-500">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-gray-400 italic">Keine Aufgaben definiert</p>
              )}
            </div>
          </div>

          {/* Sessions section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Sessions ({sessions.length})</h3>
              <button
                onClick={() => setSessions((prev) => [...prev, { title: "", description: "", calendly_url: "", show_on_dashboard: false }])}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" /> Session
              </button>
            </div>
            <div className="space-y-2">
              {sessions.map((session, i) => (
                <div key={i} className="rounded-lg border bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={session.title}
                      onChange={(e) => setSessions((prev) => prev.map((s, j) => j === i ? { ...s, title: e.target.value } : s))}
                      placeholder="Session-Titel"
                      className="flex-1 rounded border-0 bg-transparent text-sm outline-none"
                    />
                    <button onClick={() => setSessions((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={session.calendly_url}
                      onChange={(e) => setSessions((prev) => prev.map((s, j) => j === i ? { ...s, calendly_url: e.target.value } : s))}
                      placeholder="Calendly URL"
                      className="rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={session.show_on_dashboard}
                        onChange={(e) => setSessions((prev) => prev.map((s, j) => j === i ? { ...s, show_on_dashboard: e.target.checked } : s))}
                        className="rounded"
                      />
                      Im Dashboard anzeigen
                    </label>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-gray-400 italic">Keine Sessions definiert</p>
              )}
            </div>
          </div>

          {/* Materials section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Materialien ({materials.length})</h3>
              <button
                onClick={() => setMaterials((prev) => [...prev, { title: "", description: "", type: "product" }])}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" /> Material
              </button>
            </div>
            <div className="space-y-2">
              {materials.map((mat, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
                  <input
                    type="text"
                    value={mat.title}
                    onChange={(e) => setMaterials((prev) => prev.map((m, j) => j === i ? { ...m, title: e.target.value } : m))}
                    placeholder="Materialtitel"
                    className="flex-1 rounded border-0 bg-transparent text-sm outline-none"
                  />
                  <select
                    value={mat.type}
                    onChange={(e) => setMaterials((prev) => prev.map((m, j) => j === i ? { ...m, type: e.target.value as MaterialType } : m))}
                    className="rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                  >
                    {MATERIAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button onClick={() => setMaterials((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {materials.length === 0 && (
                <p className="text-xs text-gray-400 italic">Keine Materialien definiert</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Vorlage speichern"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductTemplatesClient({ initialTemplates, tags }: ProductTemplatesClientProps) {
  const [templates, setTemplates] = useState<ProductTemplate[]>(initialTemplates);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null);

  async function handleArchiveToggle(template: ProductTemplate) {
    const newStatus: ProductTemplateStatus = template.status === "archived" ? "active" : "archived";
    const res = await fetch(`/api/product-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? updated : t)));
    }
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
          Neue Produktvorlage
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Enthält</th>
              <th className="px-5 py-3">Tag</th>
              <th className="px-5 py-3">Erstellt</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  Noch keine Produktvorlagen vorhanden
                </td>
              </tr>
            )}
            {templates.map((template) => {
              const p = template.payload ?? { tasks: [], sessions: [], materials: [] };
              const taskCount = Array.isArray(p.tasks) ? p.tasks.length : 0;
              const sessionCount = Array.isArray(p.sessions) ? p.sessions.length : 0;
              const matCount = Array.isArray(p.materials) ? p.materials.length : 0;
              const parts = [
                taskCount > 0 ? `${taskCount} Aufgabe${taskCount !== 1 ? "n" : ""}` : null,
                sessionCount > 0 ? `${sessionCount} Session${sessionCount !== 1 ? "s" : ""}` : null,
                matCount > 0 ? `${matCount} Materialien` : null,
              ].filter(Boolean);

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
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{template.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {parts.length > 0 ? parts.join(" · ") : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {template.tag ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: template.tag.color }}
                      >
                        {template.tag.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(template.created_at)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={template.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        title="Bearbeiten"
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchiveToggle(template)}
                        title={template.status === "archived" ? "Wiederherstellen" : "Archivieren"}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create drawer */}
      {showCreate && (
        <ProductTemplateDrawer
          template={null}
          tags={tags}
          onSave={(saved) => {
            setTemplates((prev) => [saved, ...prev]);
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit drawer */}
      {editingTemplate && (
        <ProductTemplateDrawer
          template={editingTemplate}
          tags={tags}
          onSave={(saved) => {
            setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
            setEditingTemplate(null);
          }}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
