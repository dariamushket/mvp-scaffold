"use client";

import { useState, useRef } from "react";
import { X, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui";
import { Task, TaskTag, TaskTemplate, TaskTemplateTaskDef, TaskStatus } from "@/types";

interface SubtaskRow { id?: string; title: string; deadline: string; is_done?: boolean; }
interface AttachmentRow { id?: string; label: string; url: string; type: 'link' | 'material'; material_id?: string; }

const MATERIAL_TYPE_OPTIONS = [
  { value: 'document', label: 'Dokument' },
  { value: 'presentation', label: 'Präsentation' },
  { value: 'contract', label: 'Vertrag' },
  { value: 'report', label: 'Bericht' },
  { value: 'template', label: 'Vorlage' },
  { value: 'other', label: 'Sonstiges' },
] as const;

// For task mode
interface TaskModeProps {
  mode: 'task';
  companyId: string;
  tags: TaskTag[];
  initialTask?: Task;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
}

// For template mode
interface TemplateModeProps {
  mode: 'template';
  tags: TaskTag[];
  initialTemplate?: TaskTemplate;
  onSave: (template: TaskTemplate) => void;
  onDelete?: (templateId: string) => void;
  onClose: () => void;
}

type TaskEditorModalProps = TaskModeProps | TemplateModeProps;

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Nicht begonnen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "done", label: "Erledigt" },
];

export function TaskEditorModal(props: TaskEditorModalProps) {
  const isTaskMode = props.mode === 'task';

  // Shared fields
  const [title, setTitle] = useState(
    isTaskMode ? (props as TaskModeProps).initialTask?.title ?? '' : (props as TemplateModeProps).initialTemplate?.name ?? ''
  );
  const [description, setDescription] = useState(
    isTaskMode ? (props as TaskModeProps).initialTask?.description ?? '' : (props as TemplateModeProps).initialTemplate?.description ?? ''
  );
  const [tagId, setTagId] = useState(
    isTaskMode ? (props as TaskModeProps).initialTask?.tag_id ?? '' : (props as TemplateModeProps).initialTemplate?.tag_id ?? ''
  );
  const [deadline, setDeadline] = useState(
    isTaskMode ? (props as TaskModeProps).initialTask?.deadline ?? '' : ''
  );
  const [status, setStatus] = useState<TaskStatus>(
    isTaskMode ? ((props as TaskModeProps).initialTask?.status ?? 'not_started') : 'not_started'
  );

  // For task mode: subtasks with deadline
  const initialSubtasks: SubtaskRow[] = isTaskMode
    ? ((props as TaskModeProps).initialTask?.subtasks ?? []).map(s => ({ id: s.id, title: s.title, deadline: s.deadline ?? '', is_done: s.is_done }))
    : [];
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>(initialSubtasks);

  // For task mode: attachments
  const initialAttachments: AttachmentRow[] = isTaskMode
    ? ((props as TaskModeProps).initialTask?.attachments ?? []).map(a => ({ id: a.id, label: a.label, url: a.url, type: a.type }))
    : [];
  const [attachments, setAttachments] = useState<AttachmentRow[]>(initialAttachments);

  // For template mode: task defs
  const initialTaskDefs: TaskTemplateTaskDef[] = !isTaskMode
    ? ((props as TemplateModeProps).initialTemplate?.payload ?? [])
    : [];
  const [taskDefs, setTaskDefs] = useState<TaskTemplateTaskDef[]>(initialTaskDefs);

  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachment upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadType, setUploadType] = useState<string>('document');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAttachmentUpload() {
    if (!uploadTitle.trim()) { setUploadError('Titel ist erforderlich'); return; }
    if (!uploadFile) { setUploadError('Bitte eine Datei auswählen'); return; }
    const p = props as TaskModeProps;
    if (!p.companyId) { setUploadError('Kein Unternehmen zugewiesen'); return; }

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) fd.append('description', uploadDescription.trim());
      fd.append('company_id', p.companyId);
      fd.append('type', uploadType);
      fd.append('is_published', 'true');

      const res = await fetch('/api/materials/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Fehler beim Hochladen');
      }
      const material = await res.json();

      setAttachments(prev => [
        ...prev,
        {
          label: uploadTitle.trim(),
          url: `/api/materials/${material.id}/download?redirect=true`,
          type: 'material',
          material_id: material.id,
        },
      ]);

      // Reset upload form
      setShowUploadForm(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadType('document');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Titel ist erforderlich");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isTaskMode) {
        const p = props as TaskModeProps;
        const isEdit = !!p.initialTask;
        const url = isEdit ? `/api/tasks/${p.initialTask!.id}` : '/api/tasks';
        const method = isEdit ? 'PATCH' : 'POST';
        const body: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim() || null,
          status,
          tag_id: tagId || null,
          deadline: deadline || null,
        };
        if (!isEdit) body.company_id = p.companyId;

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? 'Fehler beim Speichern');
        }
        const savedTask = await res.json();

        const taskId = savedTask.id as string;

        if (!isEdit) {
          // New task: create all subtasks and attachments
          for (let i = 0; i < subtasks.length; i++) {
            const s = subtasks[i];
            if (!s.title.trim()) continue;
            await fetch(`/api/tasks/${taskId}/subtasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: s.title.trim(), deadline: s.deadline || null, position: i }),
            });
          }
          for (const a of attachments) {
            if (!a.label.trim() || !a.url.trim()) continue;
            await fetch(`/api/tasks/${taskId}/attachments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ label: a.label.trim(), url: a.url.trim(), type: a.type, ...(a.material_id ? { material_id: a.material_id } : {}) }),
            });
          }
        } else {
          // Edit mode: sync subtasks — PATCH existing, POST new, DELETE removed
          const existingSubtaskIds = (p.initialTask!.subtasks ?? []).map(s => s.id);
          const currentSubtaskIds = new Set(subtasks.filter(s => s.id).map(s => s.id!));

          for (const existingId of existingSubtaskIds) {
            if (!currentSubtaskIds.has(existingId)) {
              await fetch(`/api/tasks/${taskId}/subtasks/${existingId}`, { method: 'DELETE' });
            }
          }
          for (let i = 0; i < subtasks.length; i++) {
            const s = subtasks[i];
            if (!s.title.trim()) continue;
            if (s.id) {
              await fetch(`/api/tasks/${taskId}/subtasks/${s.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: s.title.trim(), deadline: s.deadline || null, position: i }),
              });
            } else {
              await fetch(`/api/tasks/${taskId}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: s.title.trim(), deadline: s.deadline || null, position: i }),
              });
            }
          }

          // Sync attachments — DELETE removed, POST new (existing attachments can't be edited in-place)
          const existingAttachmentIds = (p.initialTask!.attachments ?? []).map(a => a.id);
          const currentAttachmentIds = new Set(attachments.filter(a => a.id).map(a => a.id!));

          for (const existingId of existingAttachmentIds) {
            if (!currentAttachmentIds.has(existingId)) {
              await fetch(`/api/tasks/${taskId}/attachments/${existingId}`, { method: 'DELETE' });
            }
          }
          for (const a of attachments) {
            if (!a.label.trim() || !a.url.trim()) continue;
            if (!a.id) {
              await fetch(`/api/tasks/${taskId}/attachments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: a.label.trim(), url: a.url.trim(), type: a.type, ...(a.material_id ? { material_id: a.material_id } : {}) }),
              });
            }
          }
        }

        p.onSave(savedTask);
      } else {
        const p = props as TemplateModeProps;
        const isEdit = !!p.initialTemplate;
        const url = isEdit ? `/api/task-templates/${p.initialTemplate!.id}` : '/api/task-templates';
        const method = isEdit ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: title.trim(),
            description: description.trim() || null,
            tag_id: tagId || null,
            payload: taskDefs,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? 'Fehler beim Speichern');
        }
        const savedTemplate = await res.json();
        p.onSave(savedTemplate);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isTaskMode) {
      const p = props as TaskModeProps;
      if (p.initialTask && p.onDelete) p.onDelete(p.initialTask.id);
    } else {
      const p = props as TemplateModeProps;
      if (p.initialTemplate && p.onDelete) p.onDelete(p.initialTemplate.id);
    }
  }

  const isEdit = isTaskMode
    ? !!(props as TaskModeProps).initialTask
    : !!(props as TemplateModeProps).initialTemplate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0f2b3c]">
            {isEdit
              ? (isTaskMode ? 'Aufgabe bearbeiten' : 'Vorlage bearbeiten')
              : (isTaskMode ? 'Neue Aufgabe' : 'Neue Vorlage')}
          </h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {isTaskMode ? 'Titel' : 'Name der Vorlage'} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isTaskMode ? 'Aufgabentitel eingeben…' : 'Vorlagenname eingeben…'}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optionale Beschreibung…"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a] resize-none"
            />
          </div>

          {/* Tag + Status + Deadline (task mode) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tag</label>
              <select
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
              >
                <option value="">Kein Tag</option>
                {props.tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>

            {isTaskMode && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Subtasks (task mode) */}
          {isTaskMode && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Teilaufgaben</label>
              <div className="space-y-2">
                {subtasks.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => {
                        const next = [...subtasks];
                        next[i] = { ...next[i], title: e.target.value };
                        setSubtasks(next);
                      }}
                      placeholder="Teilaufgabe…"
                      className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
                    />
                    <input
                      type="date"
                      value={s.deadline}
                      onChange={(e) => {
                        const next = [...subtasks];
                        next[i] = { ...next[i], deadline: e.target.value };
                        setSubtasks(next);
                      }}
                      className="rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
                    />
                    <button
                      onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setSubtasks([...subtasks, { title: '', deadline: '' }])}
                  className="flex items-center gap-1.5 text-sm text-[#2d8a8a] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Teilaufgabe hinzufügen
                </button>
              </div>
            </div>
          )}

          {/* Attachments (task mode) */}
          {isTaskMode && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Anhänge</label>
              <div className="space-y-1.5">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border bg-gray-50 px-3 py-2">
                    <span className="flex-1 truncate text-sm text-gray-800">{a.label}</span>
                    <span className="shrink-0 rounded-full bg-[#e6f4f4] px-2 py-0.5 text-xs font-medium text-[#2d8a8a] capitalize">
                      {a.type === 'material' ? 'Datei' : 'Link'}
                    </span>
                    <button
                      onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                      className="shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload form */}
              {showUploadForm && (
                <div className="mt-3 rounded-lg border bg-gray-50 p-4 space-y-3">
                  {uploadError && (
                    <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{uploadError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Typ</label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
                      >
                        {MATERIAL_TYPE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Titel *</label>
                      <input
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Dateiname / Titel…"
                        className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Beschreibung</label>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={2}
                      placeholder="Optionale Beschreibung…"
                      className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a] resize-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Datei *</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-[#e6f4f4] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#2d8a8a] hover:file:bg-[#d0ecec]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setShowUploadForm(false); setUploadError(null); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleAttachmentUpload}
                      disabled={uploading}
                      className="flex items-center gap-1.5 rounded-md bg-[#2d8a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-60"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Hochladen…' : 'Hochladen'}
                    </button>
                  </div>
                </div>
              )}

              {!showUploadForm && (
                <button
                  onClick={() => { setShowUploadForm(true); setUploadError(null); }}
                  className="mt-2 flex items-center gap-1.5 text-sm text-[#2d8a8a] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Anhang hochladen
                </button>
              )}
            </div>
          )}

          {/* Template task defs (template mode) */}
          {!isTaskMode && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Aufgaben-Definitionen</label>
              <div className="space-y-3">
                {taskDefs.map((def, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2 bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <input
                        type="text"
                        value={def.title}
                        onChange={(e) => {
                          const next = [...taskDefs];
                          next[i] = { ...next[i], title: e.target.value };
                          setTaskDefs(next);
                        }}
                        placeholder="Aufgabentitel…"
                        className="flex-1 rounded border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
                      />
                      <button
                        onClick={() => setTaskDefs(taskDefs.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Deadline-Offset (Tage):</label>
                      <input
                        type="number"
                        value={def.deadline_offset_days ?? ''}
                        onChange={(e) => {
                          const next = [...taskDefs];
                          next[i] = { ...next[i], deadline_offset_days: e.target.value ? parseInt(e.target.value) : undefined };
                          setTaskDefs(next);
                        }}
                        placeholder="z.B. 7"
                        className="w-20 rounded border px-2 py-1 text-sm outline-none focus:border-[#2d8a8a]"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setTaskDefs([...taskDefs, { title: '' }])}
                  className="flex items-center gap-1.5 text-sm text-[#2d8a8a] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Aufgaben-Definition hinzufügen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div>
            {isEdit && (isTaskMode ? (props as TaskModeProps).onDelete : (props as TemplateModeProps).onDelete) && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={props.onClose} disabled={loading}>
              Abbrechen
            </Button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-md bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-60"
            >
              {loading ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
