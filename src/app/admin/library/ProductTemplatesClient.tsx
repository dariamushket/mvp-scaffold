"use client";

import { useState } from "react";
import {
  Plus, Pencil, Archive, X, ChevronDown, ChevronRight, Trash2, Upload, Link,
} from "lucide-react";
import { ProductTemplate, ProductTemplatePayload, ProductTemplateStatus, TaskTag, MaterialType } from "@/types";
import { TagSelect } from "@/components/ui/TagSelect";
import { MaterialUploadForm } from "@/components/materials/MaterialUploadForm";

interface ProductTemplatesClientProps {
  initialTemplates: ProductTemplate[];
  tags: TaskTag[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
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

// ─── Internal state types ──────────────────────────────────────────────────────

interface AttachmentRow {
  label: string;
  url: string;
  type: "link" | "material";
  material_id?: string;
}

interface SubtaskRow {
  title: string;
  deadline_offset_days?: number;
  attachments: AttachmentRow[];
}

interface TaskRow {
  title: string;
  description: string;
  tag_id: string | null;
  deadline_offset_days?: number;
  attachments: AttachmentRow[];
  subtasks: SubtaskRow[];
}

interface SessionRow {
  title: string;
  description: string;
  calendly_url: string;
  show_on_dashboard: boolean;
}

interface MaterialRow {
  title: string;
  description: string;
  type: MaterialType;
  material_id?: string; // set when a file was uploaded
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

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

  const [tasks, setTasks] = useState<TaskRow[]>(
    (initPayload.tasks ?? []).map((t) => ({
      title: t.title,
      description: t.description ?? "",
      tag_id: t.tag_id ?? null,
      deadline_offset_days: t.deadline_offset_days,
      attachments: (t.attachments ?? []).map((a) => ({
        label: a.label,
        url: a.url,
        type: (a.type ?? "link") as "link" | "material",
        material_id: (a as { material_id?: string }).material_id,
      })),
      subtasks: (t.subtasks ?? []).map((s) => ({
        title: s.title,
        deadline_offset_days: s.deadline_offset_days,
        attachments: (s.attachments ?? []).map((a) => ({
          label: a.label,
          url: a.url,
          type: (a.type ?? "link") as "link" | "material",
          material_id: (a as { material_id?: string }).material_id,
        })),
      })),
    }))
  );

  const [sessions, setSessions] = useState<SessionRow[]>(
    (initPayload.sessions ?? []).map((s) => ({
      title: s.title,
      description: s.description ?? "",
      calendly_url: s.calendly_url ?? "",
      show_on_dashboard: s.show_on_dashboard ?? false,
    }))
  );

  const [materials, setMaterials] = useState<MaterialRow[]>(
    (initPayload.materials ?? []).map((m) => ({
      title: m.title,
      description: m.description ?? "",
      type: (m.type ?? "product") as MaterialType,
      material_id: m.material_id,
    }))
  );

  // Task expand state
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [expandedSubKeys, setExpandedSubKeys] = useState<Set<string>>(new Set());

  // Upload state
  const [taskUploadIdx, setTaskUploadIdx] = useState<number | null>(null);
  const [subUploadKey, setSubUploadKey] = useState<string | null>(null);
  const [matUploadIdx, setMatUploadIdx] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Task helpers ────────────────────────────────────────────────────────────

  function updateTask(i: number, patch: Partial<TaskRow>) {
    setTasks((prev) => { const n = [...prev]; n[i] = { ...n[i], ...patch }; return n; });
  }

  function addTaskAttachment(i: number, att: AttachmentRow) {
    updateTask(i, { attachments: [...tasks[i].attachments, att] });
  }

  function removeTaskAttachment(i: number, k: number) {
    updateTask(i, { attachments: tasks[i].attachments.filter((_, m) => m !== k) });
  }

  function updateTaskAttachment(i: number, k: number, patch: Partial<AttachmentRow>) {
    const atts = [...tasks[i].attachments];
    atts[k] = { ...atts[k], ...patch };
    updateTask(i, { attachments: atts });
  }

  function addSubtask(i: number) {
    updateTask(i, { subtasks: [...tasks[i].subtasks, { title: "", deadline_offset_days: undefined, attachments: [] }] });
  }

  function removeSubtask(i: number, j: number) {
    updateTask(i, { subtasks: tasks[i].subtasks.filter((_, k) => k !== j) });
    const key = `${i}-${j}`;
    setExpandedSubKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
  }

  function updateSubtask(i: number, j: number, patch: Partial<SubtaskRow>) {
    const subs = [...tasks[i].subtasks];
    subs[j] = { ...subs[j], ...patch };
    updateTask(i, { subtasks: subs });
  }

  function addSubAttachment(i: number, j: number, att: AttachmentRow) {
    const subs = [...tasks[i].subtasks];
    subs[j] = { ...subs[j], attachments: [...(subs[j].attachments ?? []), att] };
    updateTask(i, { subtasks: subs });
  }

  function removeSubAttachment(i: number, j: number, k: number) {
    const subs = [...tasks[i].subtasks];
    subs[j] = { ...subs[j], attachments: subs[j].attachments.filter((_, m) => m !== k) };
    updateTask(i, { subtasks: subs });
  }

  function updateSubAttachment(i: number, j: number, k: number, patch: Partial<AttachmentRow>) {
    const subs = [...tasks[i].subtasks];
    const atts = [...(subs[j].attachments ?? [])];
    atts[k] = { ...atts[k], ...patch };
    subs[j] = { ...subs[j], attachments: atts };
    updateTask(i, { subtasks: subs });
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) { setError("Name ist erforderlich"); return; }
    setSaving(true);
    setError(null);

    const payload: ProductTemplatePayload = {
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description || undefined,
        tag_id: t.tag_id || undefined,
        deadline_offset_days: t.deadline_offset_days,
        attachments: t.attachments
          .filter((a) => a.label && (a.url || a.material_id))
          .map((a) => ({ label: a.label, url: a.url, type: a.type, ...(a.material_id ? { material_id: a.material_id } : {}) })),
        subtasks: t.subtasks.map((s) => ({
          title: s.title,
          deadline_offset_days: s.deadline_offset_days,
          attachments: s.attachments
            .filter((a) => a.label && (a.url || a.material_id))
            .map((a) => ({ label: a.label, url: a.url, type: a.type, ...(a.material_id ? { material_id: a.material_id } : {}) })),
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
        ...(m.material_id ? { material_id: m.material_id } : {}),
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />

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

          {/* ── Tasks ─────────────────────────────────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Aufgaben ({tasks.length})</h3>
              <button
                onClick={() => setTasks((prev) => [...prev, { title: "", description: "", tag_id: null, deadline_offset_days: undefined, attachments: [], subtasks: [] }])}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" /> Aufgabe
              </button>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 && <p className="text-xs text-gray-400 italic">Keine Aufgaben definiert</p>}
              {tasks.map((task, i) => {
                const isExpanded = expandedTasks.has(i);
                const attCount = task.attachments.length;
                const subCount = task.subtasks.length;
                return (
                  <div key={i} className="rounded-lg border bg-gray-50">
                    {/* Collapsed row */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button onClick={() => setExpandedTasks((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="text-gray-400 hover:text-gray-600 shrink-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(i, { title: e.target.value })}
                        placeholder="Aufgabentitel"
                        className="flex-1 rounded border-0 bg-transparent text-sm outline-none"
                      />
                      <span className="text-xs text-gray-400 shrink-0">
                        {[subCount > 0 && `${subCount} Sub`, attCount > 0 && `${attCount} Anhang`].filter(Boolean).join(" · ")}
                      </span>
                      <button onClick={() => { setTasks((prev) => prev.filter((_, j) => j !== i)); setExpandedTasks((prev) => { const n = new Set(prev); n.delete(i); return n; }); }} className="text-gray-400 hover:text-red-500 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div className="border-t px-3 pb-3 pt-3 space-y-3">
                        {/* Description */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Beschreibung</label>
                          <textarea
                            value={task.description}
                            onChange={(e) => updateTask(i, { description: e.target.value })}
                            rows={2}
                            placeholder="Optionale Beschreibung…"
                            className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white resize-none"
                          />
                        </div>

                        {/* Tag + Deadline offset */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Tag</label>
                            <TagSelect
                              tags={localTags}
                              value={task.tag_id}
                              onChange={(id) => updateTask(i, { tag_id: id })}
                              onTagCreated={(t) => setLocalTags((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))}
                              placeholder="Kein Tag"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Fälligkeit (Tage ab Aktivierung)</label>
                            <input
                              type="number"
                              value={task.deadline_offset_days ?? ""}
                              onChange={(e) => updateTask(i, { deadline_offset_days: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="z. B. 14"
                              className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                            />
                          </div>
                        </div>

                        {/* Attachments */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Anhänge</label>
                          <div className="space-y-1.5">
                            {task.attachments.map((a, k) => (
                              a.material_id ? (
                                <div key={k} className="flex items-center justify-between gap-2 rounded border bg-white px-2 py-1.5">
                                  <span className="flex-1 truncate text-xs text-gray-800">{a.label}</span>
                                  <span className="shrink-0 rounded-full bg-[#e6f4f4] px-1.5 py-0.5 text-[10px] font-medium text-[#2d8a8a]">Datei</span>
                                  <button onClick={() => removeTaskAttachment(i, k)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <div key={k} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={a.label}
                                    onChange={(e) => updateTaskAttachment(i, k, { label: e.target.value })}
                                    placeholder="Bezeichnung…"
                                    className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                                  />
                                  <input
                                    type="text"
                                    value={a.url}
                                    onChange={(e) => updateTaskAttachment(i, k, { url: e.target.value })}
                                    placeholder="https://…"
                                    className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                                  />
                                  <button onClick={() => removeTaskAttachment(i, k)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                                </div>
                              )
                            ))}

                            {taskUploadIdx === i && (
                              <MaterialUploadForm
                                companyId={null}
                                onSuccess={(m) => {
                                  addTaskAttachment(i, { label: m.title, url: `/api/materials/${m.id}/download?redirect=true`, type: "material", material_id: m.id });
                                  setTaskUploadIdx(null);
                                }}
                                onCancel={() => setTaskUploadIdx(null)}
                                className="mt-1"
                              />
                            )}

                            {taskUploadIdx !== i && (
                              <div className="flex items-center gap-3 mt-1">
                                <button
                                  onClick={() => addTaskAttachment(i, { label: "", url: "", type: "link" })}
                                  className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                                >
                                  <Link className="h-3.5 w-3.5" /> Link
                                </button>
                                <button
                                  onClick={() => setTaskUploadIdx(i)}
                                  className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                                >
                                  <Upload className="h-3.5 w-3.5" /> Datei hochladen
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subtasks */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Teilaufgaben</label>
                          <div className="space-y-1.5">
                            {task.subtasks.map((sub, j) => {
                              const subKey = `${i}-${j}`;
                              const isSubExpanded = expandedSubKeys.has(subKey);
                              const subAttCount = sub.attachments.length;
                              return (
                                <div key={j} className="rounded border bg-white">
                                  <div className="flex items-center gap-2 px-2 py-1.5">
                                    <input
                                      type="text"
                                      value={sub.title}
                                      onChange={(e) => updateSubtask(i, j, { title: e.target.value })}
                                      placeholder="Teilaufgabe…"
                                      className="flex-1 rounded border-0 bg-transparent text-xs outline-none"
                                    />
                                    <input
                                      type="number"
                                      value={sub.deadline_offset_days ?? ""}
                                      onChange={(e) => updateSubtask(i, j, { deadline_offset_days: e.target.value ? Number(e.target.value) : undefined })}
                                      placeholder="+Tage"
                                      title="Fälligkeit (Tage)"
                                      className="w-16 rounded border px-1.5 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                                    />
                                    <button
                                      onClick={() => setExpandedSubKeys((prev) => { const n = new Set(prev); n.has(subKey) ? n.delete(subKey) : n.add(subKey); return n; })}
                                      className="flex items-center gap-0.5 text-gray-400 hover:text-[#2d8a8a] shrink-0"
                                      title="Anhänge"
                                    >
                                      {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                      <Link className="h-3 w-3" />
                                      {subAttCount > 0 && <span className="text-[10px]">{subAttCount}</span>}
                                    </button>
                                    <button onClick={() => removeSubtask(i, j)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                                  </div>

                                  {isSubExpanded && (
                                    <div className="border-t px-2 pb-2 pt-1.5 space-y-1">
                                      <p className="text-[10px] font-medium text-gray-400">Anhänge (Teilaufgabe)</p>
                                      {sub.attachments.map((a, k) => (
                                        a.material_id ? (
                                          <div key={k} className="flex items-center justify-between gap-1.5 rounded border px-2 py-1">
                                            <span className="flex-1 truncate text-[10px] text-gray-700">{a.label}</span>
                                            <span className="text-[9px] text-[#2d8a8a]">Datei</span>
                                            <button onClick={() => removeSubAttachment(i, j, k)} className="text-gray-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                                          </div>
                                        ) : (
                                          <div key={k} className="flex items-center gap-1.5">
                                            <input type="text" value={a.label} onChange={(e) => updateSubAttachment(i, j, k, { label: e.target.value })} placeholder="Bezeichnung…" className="flex-1 rounded border px-1.5 py-0.5 text-[10px] outline-none focus:border-[#2d8a8a]" />
                                            <input type="text" value={a.url} onChange={(e) => updateSubAttachment(i, j, k, { url: e.target.value })} placeholder="https://…" className="flex-1 rounded border px-1.5 py-0.5 text-[10px] outline-none focus:border-[#2d8a8a]" />
                                            <button onClick={() => removeSubAttachment(i, j, k)} className="text-gray-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                                          </div>
                                        )
                                      ))}

                                      {subUploadKey === subKey && (
                                        <MaterialUploadForm
                                          companyId={null}
                                          onSuccess={(m) => {
                                            addSubAttachment(i, j, { label: m.title, url: `/api/materials/${m.id}/download?redirect=true`, type: "material", material_id: m.id });
                                            setSubUploadKey(null);
                                          }}
                                          onCancel={() => setSubUploadKey(null)}
                                          className="mt-1"
                                        />
                                      )}

                                      {subUploadKey !== subKey && (
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <button onClick={() => addSubAttachment(i, j, { label: "", url: "", type: "link" })} className="flex items-center gap-0.5 text-[10px] text-[#2d8a8a] hover:underline">
                                            <Plus className="h-2.5 w-2.5" /> Link
                                          </button>
                                          <button onClick={() => setSubUploadKey(subKey)} className="flex items-center gap-0.5 text-[10px] text-[#2d8a8a] hover:underline">
                                            <Upload className="h-2.5 w-2.5" /> Datei
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <button onClick={() => addSubtask(i)} className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline mt-1">
                              <Plus className="h-3.5 w-3.5" /> Teilaufgabe hinzufügen
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sessions ──────────────────────────────────────────────────────── */}
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
              {sessions.length === 0 && <p className="text-xs text-gray-400 italic">Keine Sessions definiert</p>}
              {sessions.map((session, i) => (
                <div key={i} className="rounded-lg border bg-gray-50 px-3 py-2 space-y-2">
                  <div className="flex items-center gap-2">
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
            </div>
          </div>

          {/* ── Materials ─────────────────────────────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Materialien ({materials.length})</h3>
              <button
                onClick={() => setMaterials((prev) => [...prev, { title: "", description: "", type: "product" }])}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" /> Platzhalter
              </button>
            </div>
            <div className="space-y-2">
              {materials.length === 0 && <p className="text-xs text-gray-400 italic">Keine Materialien definiert</p>}
              {materials.map((mat, i) => (
                <div key={i} className="rounded-lg border bg-gray-50">
                  {mat.material_id ? (
                    // Already uploaded
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{mat.title}</p>
                        <span className="text-xs text-[#2d8a8a]">Datei hochgeladen</span>
                      </div>
                      <span className="text-xs text-gray-400">{MATERIAL_TYPE_OPTIONS.find(o => o.value === mat.type)?.label}</span>
                      <button onClick={() => setMaterials((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    // Placeholder definition
                    <div className="space-y-2 px-3 py-2">
                      <div className="flex items-center gap-2">
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
                        <button onClick={() => setMaterials((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* File upload for this material */}
                      {matUploadIdx === i ? (
                        <MaterialUploadForm
                          companyId={null}
                          onSuccess={(m) => {
                            setMaterials((prev) => prev.map((mat2, j) => j === i ? { ...mat2, title: mat2.title || m.title, material_id: m.id } : mat2));
                            setMatUploadIdx(null);
                          }}
                          onCancel={() => setMatUploadIdx(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setMatUploadIdx(i)}
                          className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                        >
                          <Upload className="h-3 w-3" /> Datei jetzt hochladen (optional)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

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
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878]"
        >
          <Plus className="h-4 w-4" />
          Neue Produktvorlage
        </button>
      </div>

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
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: template.tag.color }}>
                        {template.tag.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(template.created_at)}</td>
                  <td className="px-5 py-4"><StatusBadge status={template.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditingTemplate(template)} title="Bearbeiten" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleArchiveToggle(template)} title={template.status === "archived" ? "Wiederherstellen" : "Archivieren"} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
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

      {showCreate && (
        <ProductTemplateDrawer
          template={null}
          tags={tags}
          onSave={(saved) => { setTemplates((prev) => [saved, ...prev]); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingTemplate && (
        <ProductTemplateDrawer
          template={editingTemplate}
          tags={tags}
          onSave={(saved) => { setTemplates((prev) => prev.map((t) => t.id === saved.id ? saved : t)); setEditingTemplate(null); }}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
