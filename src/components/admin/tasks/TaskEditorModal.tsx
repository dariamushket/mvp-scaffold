"use client";

import { useState, useRef } from "react";
import { X, Plus, Trash2, Upload, ChevronDown, ChevronRight, Link } from "lucide-react";
import { Button } from "@/components/ui";
import { TagSelect } from "@/components/ui/TagSelect";
import { Task, TaskTag, TaskTemplate, TaskTemplateTaskDef, TaskStatus, SubtaskAttachment } from "@/types";

interface SubtaskRow {
  id?: string;
  title: string;
  deadline: string;
  is_done?: boolean;
  // for task mode: existing + new attachments
  attachments?: SubtaskAttachmentRow[];
}
interface SubtaskAttachmentRow { id?: string; label: string; url: string; type: 'link' | 'material'; material_id?: string; }
interface AttachmentRow { id?: string; label: string; url: string; type: 'link' | 'material'; material_id?: string; }

// Template-mode subtask definition (link-only, no file upload in template context)
interface TemplateLinkRow { label: string; url: string; }

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
  const [tagId, setTagId] = useState<string>(
    isTaskMode ? (props as TaskModeProps).initialTask?.tag_id ?? '' : (props as TemplateModeProps).initialTemplate?.tag_id ?? ''
  );
  const [localTags, setLocalTags] = useState<TaskTag[]>(props.tags);

  function handleTagCreated(newTag: TaskTag) {
    setLocalTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
  }
  const [deadline, setDeadline] = useState(
    isTaskMode ? (props as TaskModeProps).initialTask?.deadline ?? '' : ''
  );
  const [status, setStatus] = useState<TaskStatus>(
    isTaskMode ? ((props as TaskModeProps).initialTask?.status ?? 'not_started') : 'not_started'
  );

  // For task mode: subtasks with deadline + attachments
  const initialSubtasks: SubtaskRow[] = isTaskMode
    ? ((props as TaskModeProps).initialTask?.subtasks ?? []).map(s => ({
        id: s.id,
        title: s.title,
        deadline: s.deadline ?? '',
        is_done: s.is_done,
        attachments: (s.attachments ?? []).map((a: SubtaskAttachment) => ({
          id: a.id, label: a.label, url: a.url, type: a.type, material_id: a.material_id ?? undefined,
        })),
      }))
    : [];
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>(initialSubtasks);

  // For task mode: expanded subtask rows (showing attachment section)
  const [expandedSubtaskIdx, setExpandedSubtaskIdx] = useState<Set<number>>(new Set());

  // For task mode: parent task attachments
  const initialAttachments: AttachmentRow[] = isTaskMode
    ? ((props as TaskModeProps).initialTask?.attachments ?? []).map(a => ({ id: a.id, label: a.label, url: a.url, type: a.type }))
    : [];
  const [attachments, setAttachments] = useState<AttachmentRow[]>(initialAttachments);

  // For template mode: task defs
  const initialTaskDefs: TaskTemplateTaskDef[] = !isTaskMode
    ? ((props as TemplateModeProps).initialTemplate?.payload ?? [])
    : [];
  const [taskDefs, setTaskDefs] = useState<TaskTemplateTaskDef[]>(initialTaskDefs);

  // For template mode: expanded task def index (showing subtask / attachment sections)
  const [expandedDefIdx, setExpandedDefIdx] = useState<Set<number>>(new Set());
  // For template mode: expanded subtask def (showing per-subtask links)
  const [expandedSubDefKey, setExpandedSubDefKey] = useState<Set<string>>(new Set()); // "defIdx-subIdx"

  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parent task attachment upload form state (task mode)
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadType, setUploadType] = useState<string>('document');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtask attachment upload form state (task mode) — keyed by subtask index
  const [subtaskUploadIdx, setSubtaskUploadIdx] = useState<number | null>(null);
  const [subUploadType, setSubUploadType] = useState<string>('document');
  const [subUploadTitle, setSubUploadTitle] = useState('');
  const [subUploadDescription, setSubUploadDescription] = useState('');
  const [subUploadFile, setSubUploadFile] = useState<File | null>(null);
  const [subUploading, setSubUploading] = useState(false);
  const [subUploadError, setSubUploadError] = useState<string | null>(null);
  const subFileInputRef = useRef<HTMLInputElement>(null);

  // ── Helper: add a link attachment row to a subtask (task mode) ──
  function updateSubtaskAttachments(subtaskIdx: number, update: (prev: SubtaskAttachmentRow[]) => SubtaskAttachmentRow[]) {
    setSubtasks(prev => {
      const next = [...prev];
      next[subtaskIdx] = { ...next[subtaskIdx], attachments: update(next[subtaskIdx].attachments ?? []) };
      return next;
    });
  }

  // ── File upload: parent task attachment ──
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

      setAttachments(prev => [...prev, {
        label: uploadTitle.trim(),
        url: `/api/materials/${material.id}/download?redirect=true`,
        type: 'material',
        material_id: material.id,
      }]);

      setShowUploadForm(false);
      setUploadTitle(''); setUploadDescription(''); setUploadType('document'); setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  }

  // ── File upload: subtask attachment ──
  async function handleSubtaskAttachmentUpload(subtaskIdx: number) {
    if (!subUploadTitle.trim()) { setSubUploadError('Titel ist erforderlich'); return; }
    if (!subUploadFile) { setSubUploadError('Bitte eine Datei auswählen'); return; }
    const p = props as TaskModeProps;
    if (!p.companyId) { setSubUploadError('Kein Unternehmen zugewiesen'); return; }

    setSubUploading(true);
    setSubUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', subUploadFile);
      fd.append('title', subUploadTitle.trim());
      if (subUploadDescription.trim()) fd.append('description', subUploadDescription.trim());
      fd.append('company_id', p.companyId);
      fd.append('type', subUploadType);
      fd.append('is_published', 'true');

      const res = await fetch('/api/materials/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Fehler beim Hochladen');
      }
      const material = await res.json();

      updateSubtaskAttachments(subtaskIdx, prev => [...prev, {
        label: subUploadTitle.trim(),
        url: `/api/materials/${material.id}/download?redirect=true`,
        type: 'material',
        material_id: material.id,
      }]);

      setSubtaskUploadIdx(null);
      setSubUploadTitle(''); setSubUploadDescription(''); setSubUploadType('document'); setSubUploadFile(null);
      if (subFileInputRef.current) subFileInputRef.current.value = '';
    } catch (e: unknown) {
      setSubUploadError(e instanceof Error ? e.message : 'Fehler beim Hochladen');
    } finally {
      setSubUploading(false);
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
        // For PATCH, the endpoint returns { success: true }; use the known initialTask.id
        const taskId = isEdit ? p.initialTask!.id : (savedTask.id as string);

        if (!isEdit) {
          // New task: create all subtasks (with their attachments) and parent attachments
          for (let i = 0; i < subtasks.length; i++) {
            const s = subtasks[i];
            if (!s.title.trim()) continue;
            const subtaskRes = await fetch(`/api/tasks/${taskId}/subtasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: s.title.trim(), deadline: s.deadline || null, position: i }),
            });
            if (subtaskRes.ok && (s.attachments ?? []).length > 0) {
              const createdSubtask = await subtaskRes.json();
              for (const a of s.attachments ?? []) {
                if (!a.label.trim() || !a.url.trim()) continue;
                await fetch(`/api/tasks/${taskId}/subtasks/${createdSubtask.id}/attachments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ label: a.label.trim(), url: a.url.trim(), type: a.type, ...(a.material_id ? { material_id: a.material_id } : {}) }),
                });
              }
            }
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
          // Edit mode: sync subtasks
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

            let subtaskId: string;
            if (s.id) {
              await fetch(`/api/tasks/${taskId}/subtasks/${s.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: s.title.trim(), deadline: s.deadline || null, position: i }),
              });
              subtaskId = s.id;
            } else {
              const subtaskRes = await fetch(`/api/tasks/${taskId}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: s.title.trim(), deadline: s.deadline || null, position: i }),
              });
              const created = await subtaskRes.json();
              subtaskId = created.id;
            }

            // Sync subtask attachments
            const originalSub = (p.initialTask!.subtasks ?? []).find(os => os.id === s.id);
            const existingAttIds = (originalSub?.attachments ?? []).map((a: SubtaskAttachment) => a.id);
            const currentAttIds = new Set((s.attachments ?? []).filter(a => a.id).map(a => a.id!));

            for (const existingAttId of existingAttIds) {
              if (!currentAttIds.has(existingAttId)) {
                await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}/attachments/${existingAttId}`, { method: 'DELETE' });
              }
            }
            for (const a of s.attachments ?? []) {
              if (!a.label.trim() || !a.url.trim()) continue;
              if (!a.id) {
                await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}/attachments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ label: a.label.trim(), url: a.url.trim(), type: a.type, ...(a.material_id ? { material_id: a.material_id } : {}) }),
                });
              }
            }
          }

          // Sync parent attachments
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

        // In edit mode, PATCH returns { success: true } — reconstruct the updated task for the parent
        const taskForParent = isEdit
          ? { ...p.initialTask!, title: title.trim(), description: description.trim() || null, status, tag_id: tagId || null, deadline: deadline || null }
          : savedTask;
        p.onSave(taskForParent);
      } else {
        // Template mode: save payload (subtask defs + their link attachments are already in taskDefs state)
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

  // ── Template-mode helpers ──
  function updateTaskDef(i: number, patch: Partial<TaskTemplateTaskDef>) {
    setTaskDefs(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch }; return next; });
  }

  function addSubDefToTask(i: number) {
    const subs = [...(taskDefs[i].subtasks ?? []), { title: '' }];
    updateTaskDef(i, { subtasks: subs });
  }

  function updateSubDef(i: number, j: number, patch: Partial<{ title: string; deadline_offset_days: number | undefined; attachments: TemplateLinkRow[] }>) {
    const subs = [...(taskDefs[i].subtasks ?? [])];
    subs[j] = { ...subs[j], ...patch };
    updateTaskDef(i, { subtasks: subs });
  }

  function removeSubDef(i: number, j: number) {
    const subs = (taskDefs[i].subtasks ?? []).filter((_, k) => k !== j);
    updateTaskDef(i, { subtasks: subs });
  }

  function addLinkToTaskDef(i: number) {
    const atts = [...(taskDefs[i].attachments ?? []), { label: '', url: '' }];
    updateTaskDef(i, { attachments: atts });
  }

  function updateTaskDefLink(i: number, k: number, patch: Partial<{ label: string; url: string }>) {
    const atts = [...(taskDefs[i].attachments ?? [])];
    atts[k] = { ...atts[k], ...patch };
    updateTaskDef(i, { attachments: atts });
  }

  function removeLinkFromTaskDef(i: number, k: number) {
    const atts = (taskDefs[i].attachments ?? []).filter((_, m) => m !== k);
    updateTaskDef(i, { attachments: atts });
  }

  function addLinkToSubDef(i: number, j: number) {
    const subs = [...(taskDefs[i].subtasks ?? [])];
    const atts = [...(subs[j].attachments ?? []), { label: '', url: '' }];
    subs[j] = { ...subs[j], attachments: atts };
    updateTaskDef(i, { subtasks: subs });
  }

  function updateSubDefLink(i: number, j: number, k: number, patch: Partial<{ label: string; url: string }>) {
    const subs = [...(taskDefs[i].subtasks ?? [])];
    const atts = [...(subs[j].attachments ?? [])];
    atts[k] = { ...atts[k], ...patch };
    subs[j] = { ...subs[j], attachments: atts };
    updateTaskDef(i, { subtasks: subs });
  }

  function removeLinkFromSubDef(i: number, j: number, k: number) {
    const subs = [...(taskDefs[i].subtasks ?? [])];
    const atts = (subs[j].attachments ?? []).filter((_, m) => m !== k);
    subs[j] = { ...subs[j], attachments: atts };
    updateTaskDef(i, { subtasks: subs });
  }

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
              <TagSelect
                tags={localTags}
                value={tagId || null}
                onChange={(id) => setTagId(id ?? '')}
                onTagCreated={handleTagCreated}
              />
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

          {/* ── TASK MODE: Subtasks + their attachments ── */}
          {isTaskMode && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Teilaufgaben</label>
              <div className="space-y-2">
                {subtasks.map((s, i) => {
                  const isSubExpanded = expandedSubtaskIdx.has(i);
                  const attCount = (s.attachments ?? []).length;
                  return (
                    <div key={i} className="rounded-lg border bg-gray-50">
                      {/* Subtask row */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input
                          type="text"
                          value={s.title}
                          onChange={(e) => {
                            const next = [...subtasks];
                            next[i] = { ...next[i], title: e.target.value };
                            setSubtasks(next);
                          }}
                          placeholder="Teilaufgabe…"
                          className="flex-1 rounded border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a] bg-white"
                        />
                        <input
                          type="date"
                          value={s.deadline}
                          onChange={(e) => {
                            const next = [...subtasks];
                            next[i] = { ...next[i], deadline: e.target.value };
                            setSubtasks(next);
                          }}
                          className="rounded border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a] bg-white"
                        />
                        <button
                          onClick={() => {
                            setExpandedSubtaskIdx(prev => {
                              const next = new Set(prev);
                              next.has(i) ? next.delete(i) : next.add(i);
                              return next;
                            });
                          }}
                          className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-[#2d8a8a] shrink-0"
                          title="Anhänge"
                        >
                          {isSubExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <Link className="h-3.5 w-3.5" />
                          {attCount > 0 && <span className="text-[10px]">{attCount}</span>}
                        </button>
                        <button
                          onClick={() => {
                            setSubtasks(subtasks.filter((_, j) => j !== i));
                            setExpandedSubtaskIdx(prev => {
                              const next = new Set(prev);
                              next.delete(i);
                              return next;
                            });
                          }}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Subtask attachment section */}
                      {isSubExpanded && (
                        <div className="border-t px-3 pb-3 pt-2 space-y-1.5">
                          <p className="text-xs font-medium text-gray-500 mb-1">Anhänge der Teilaufgabe</p>
                          {(s.attachments ?? []).map((a, k) => (
                            // New link (no id): show editable inputs; existing or uploaded file: show display row
                            !a.id && a.type === 'link' ? (
                              <div key={k} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={a.label}
                                  onChange={(e) => updateSubtaskAttachments(i, prev => {
                                    const next = [...prev]; next[k] = { ...next[k], label: e.target.value }; return next;
                                  })}
                                  placeholder="Bezeichnung…"
                                  className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                                />
                                <input
                                  type="url"
                                  value={a.url}
                                  onChange={(e) => updateSubtaskAttachments(i, prev => {
                                    const next = [...prev]; next[k] = { ...next[k], url: e.target.value }; return next;
                                  })}
                                  placeholder="https://…"
                                  className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                                />
                                <button
                                  onClick={() => updateSubtaskAttachments(i, prev => prev.filter((_, m) => m !== k))}
                                  className="shrink-0 text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div key={k} className="flex items-center justify-between gap-2 rounded border bg-white px-2 py-1.5">
                                <span className="flex-1 truncate text-xs text-gray-800">{a.label}</span>
                                <span className="shrink-0 rounded-full bg-[#e6f4f4] px-1.5 py-0.5 text-[10px] font-medium text-[#2d8a8a] capitalize">
                                  {a.type === 'material' ? 'Datei' : 'Link'}
                                </span>
                                <button
                                  onClick={() => updateSubtaskAttachments(i, prev => prev.filter((_, m) => m !== k))}
                                  className="shrink-0 text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )
                          ))}

                          {/* Subtask upload form */}
                          {subtaskUploadIdx === i && (
                            <div className="mt-2 rounded border bg-white p-3 space-y-2">
                              {subUploadError && (
                                <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{subUploadError}</div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-600">Typ</label>
                                  <select
                                    value={subUploadType}
                                    onChange={(e) => setSubUploadType(e.target.value)}
                                    className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
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
                                    value={subUploadTitle}
                                    onChange={(e) => setSubUploadTitle(e.target.value)}
                                    placeholder="Dateiname…"
                                    className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Datei *</label>
                                <input
                                  ref={subFileInputRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => setSubUploadFile(e.target.files?.[0] ?? null)}
                                  className="w-full text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-[#e6f4f4] file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-[#2d8a8a]"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setSubtaskUploadIdx(null); setSubUploadError(null); }}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  onClick={() => handleSubtaskAttachmentUpload(i)}
                                  disabled={subUploading}
                                  className="flex items-center gap-1 rounded bg-[#2d8a8a] px-2 py-1 text-xs font-medium text-white hover:bg-[#267878] disabled:opacity-60"
                                >
                                  <Upload className="h-3 w-3" />
                                  {subUploading ? 'Hochladen…' : 'Hochladen'}
                                </button>
                              </div>
                            </div>
                          )}

                          {subtaskUploadIdx !== i && (
                            <div className="flex items-center gap-3 mt-1">
                              <button
                                onClick={() => {
                                  updateSubtaskAttachments(i, prev => [...prev, { label: '', url: '', type: 'link' }]);
                                }}
                                className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Link hinzufügen
                              </button>
                              <button
                                onClick={() => { setSubtaskUploadIdx(i); setSubUploadError(null); }}
                                className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Datei hochladen
                              </button>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setSubtasks([...subtasks, { title: '', deadline: '', attachments: [] }])}
                  className="flex items-center gap-1.5 text-sm text-[#2d8a8a] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Teilaufgabe hinzufügen
                </button>
              </div>
            </div>
          )}

          {/* ── TASK MODE: Parent task attachments ── */}
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

          {/* ── TEMPLATE MODE: Task defs with subtasks + link attachments ── */}
          {!isTaskMode && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Aufgaben-Definitionen</label>
              <div className="space-y-3">
                {taskDefs.map((def, i) => {
                  const isDefExpanded = expandedDefIdx.has(i);
                  const subCount = (def.subtasks ?? []).length;
                  const attCount = (def.attachments ?? []).length;

                  return (
                    <div key={i} className="rounded-lg border bg-gray-50">
                      {/* Task def header row */}
                      <div className="flex items-start gap-2 p-3">
                        <button
                          onClick={() => setExpandedDefIdx(prev => {
                            const next = new Set(prev);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          })}
                          className="mt-2 text-gray-400 hover:text-gray-600 shrink-0"
                        >
                          {isDefExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={def.title}
                            onChange={(e) => updateTaskDef(i, { title: e.target.value })}
                            placeholder="Aufgabentitel…"
                            className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a] bg-white"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Deadline-Offset (Tage):</label>
                            <input
                              type="number"
                              value={def.deadline_offset_days ?? ''}
                              onChange={(e) => updateTaskDef(i, { deadline_offset_days: e.target.value ? parseInt(e.target.value) : undefined })}
                              placeholder="z.B. 7"
                              className="w-20 rounded border px-2 py-1 text-sm outline-none focus:border-[#2d8a8a] bg-white"
                            />
                            <span className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                              {subCount > 0 && <span>{subCount} Teilaufgabe{subCount !== 1 ? 'n' : ''}</span>}
                              {attCount > 0 && <span>{attCount} Link{attCount !== 1 ? 's' : ''}</span>}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setTaskDefs(taskDefs.filter((_, j) => j !== i))}
                          className="mt-1 text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Expanded: subtasks + links */}
                      {isDefExpanded && (
                        <div className="border-t px-3 pb-3 pt-2 space-y-3">
                          {/* Link attachments for parent task def */}
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-gray-500">Links (Aufgabe)</p>
                            <div className="space-y-1.5">
                              {(def.attachments ?? []).map((a, k) => (
                                <div key={k} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={a.label}
                                    onChange={(e) => updateTaskDefLink(i, k, { label: e.target.value })}
                                    placeholder="Bezeichnung…"
                                    className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                                  />
                                  <input
                                    type="url"
                                    value={a.url}
                                    onChange={(e) => updateTaskDefLink(i, k, { url: e.target.value })}
                                    placeholder="https://…"
                                    className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a] bg-white"
                                  />
                                  <button
                                    onClick={() => removeLinkFromTaskDef(i, k)}
                                    className="text-gray-400 hover:text-red-500 shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addLinkToTaskDef(i)}
                                className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Link hinzufügen
                              </button>
                            </div>
                          </div>

                          {/* Subtask defs */}
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-gray-500">Teilaufgaben</p>
                            <div className="space-y-2">
                              {(def.subtasks ?? []).map((sub, j) => {
                                const subKey = `${i}-${j}`;
                                const isSubExpanded = expandedSubDefKey.has(subKey);
                                const subAttCount = (sub.attachments ?? []).length;
                                return (
                                  <div key={j} className="rounded border bg-white">
                                    {/* Subtask def row */}
                                    <div className="flex items-center gap-2 px-2 py-1.5">
                                      <input
                                        type="text"
                                        value={sub.title}
                                        onChange={(e) => updateSubDef(i, j, { title: e.target.value })}
                                        placeholder="Teilaufgabe…"
                                        className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                                      />
                                      <input
                                        type="number"
                                        value={sub.deadline_offset_days ?? ''}
                                        onChange={(e) => updateSubDef(i, j, { deadline_offset_days: e.target.value ? parseInt(e.target.value) : undefined })}
                                        placeholder="+Tage"
                                        title="Deadline-Offset (Tage)"
                                        className="w-16 rounded border px-2 py-1 text-xs outline-none focus:border-[#2d8a8a]"
                                      />
                                      <button
                                        onClick={() => setExpandedSubDefKey(prev => {
                                          const next = new Set(prev);
                                          next.has(subKey) ? next.delete(subKey) : next.add(subKey);
                                          return next;
                                        })}
                                        className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-[#2d8a8a] shrink-0"
                                        title="Links"
                                      >
                                        {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        <Link className="h-3 w-3" />
                                        {subAttCount > 0 && <span>{subAttCount}</span>}
                                      </button>
                                      <button
                                        onClick={() => removeSubDef(i, j)}
                                        className="text-gray-400 hover:text-red-500 shrink-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>

                                    {/* Subtask def links */}
                                    {isSubExpanded && (
                                      <div className="border-t px-2 pb-2 pt-1.5 space-y-1">
                                        <p className="text-[10px] font-medium text-gray-400">Links (Teilaufgabe)</p>
                                        {(sub.attachments ?? []).map((a, k) => (
                                          <div key={k} className="flex items-center gap-1.5">
                                            <input
                                              type="text"
                                              value={a.label}
                                              onChange={(e) => updateSubDefLink(i, j, k, { label: e.target.value })}
                                              placeholder="Bezeichnung…"
                                              className="flex-1 rounded border px-2 py-0.5 text-xs outline-none focus:border-[#2d8a8a]"
                                            />
                                            <input
                                              type="url"
                                              value={a.url}
                                              onChange={(e) => updateSubDefLink(i, j, k, { url: e.target.value })}
                                              placeholder="https://…"
                                              className="flex-1 rounded border px-2 py-0.5 text-xs outline-none focus:border-[#2d8a8a]"
                                            />
                                            <button
                                              onClick={() => removeLinkFromSubDef(i, j, k)}
                                              className="text-gray-400 hover:text-red-500 shrink-0"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => addLinkToSubDef(i, j)}
                                          className="flex items-center gap-1 text-[10px] text-[#2d8a8a] hover:underline"
                                        >
                                          <Plus className="h-3 w-3" />
                                          Link hinzufügen
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <button
                                onClick={() => addSubDefToTask(i)}
                                className="flex items-center gap-1 text-xs text-[#2d8a8a] hover:underline"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Teilaufgabe hinzufügen
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
