"use client";

import { useState } from "react";
import { TaskTag } from "@/types";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";

const COLOR_SWATCHES = [
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
];

interface TagsClientProps {
  initialTags: TaskTag[];
}

interface TagFormState {
  name: string;
  color: string;
}

export function TagsClient({ initialTags }: TagsClientProps) {
  const [tags, setTags] = useState<TaskTag[]>(initialTags);
  const [search, setSearch] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TaskTag | null>(null);
  const [form, setForm] = useState<TagFormState>({ name: "", color: COLOR_SWATCHES[0] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingTag(null);
    setForm({ name: "", color: COLOR_SWATCHES[0] });
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(tag: TaskTag) {
    setEditingTag(tag);
    setForm({ name: tag.name, color: tag.color });
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingTag(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Name ist erforderlich");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingTag) {
        // PATCH
        const res = await fetch(`/api/task-tags/${editingTag.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), color: form.color }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Fehler");
        setTags((prev) => prev.map((t) => (t.id === editingTag.id ? (data as TaskTag) : t)));
      } else {
        // POST
        const res = await fetch("/api/task-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), color: form.color }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Fehler");
        setTags((prev) => [...prev, data as TaskTag].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle(tag: TaskTag) {
    const res = await fetch(`/api/task-tags/${tag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: !tag.is_archived }),
    });
    if (res.ok) {
      const data = await res.json();
      setTags((prev) => prev.map((t) => (t.id === tag.id ? (data as TaskTag) : t)));
    }
  }

  async function handleArchiveFromModal() {
    if (!editingTag) return;
    setSaving(true);
    await handleArchiveToggle(editingTag);
    setSaving(false);
    closeModal();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2b3c]">Tags</h1>
          <p className="mt-1 text-sm text-gray-500">Verwaltung der Dimensionstags für Aufgaben und Materialien</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878]"
        >
          <Plus className="h-4 w-4" />
          Neuer Tag
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tags suchen…"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
      />

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left w-10">Farbe</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Keine Tags gefunden
                </td>
              </tr>
            )}
            {filtered.map((tag) => (
              <tr key={tag.id} className={tag.is_archived ? "opacity-50" : ""}>
                <td className="px-4 py-3">
                  <span
                    className="inline-block h-5 w-5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{tag.name}</td>
                <td className="px-4 py-3">
                  {tag.is_archived ? (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      Archiviert
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Aktiv
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(tag)}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleArchiveToggle(tag)}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                      title={tag.is_archived ? "Wiederherstellen" : "Archivieren"}
                    >
                      {tag.is_archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
              {editingTag ? "Tag bearbeiten" : "Neuer Tag"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tag-Name"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Farbe</label>
                <div className="flex gap-2.5 flex-wrap">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: form.color === c ? "#0f2b3c" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#2d8a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-50"
              >
                {saving ? "…" : "Speichern"}
              </button>
              <button
                onClick={closeModal}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>

            {editingTag && (
              <div className="mt-3 border-t pt-3">
                <button
                  onClick={handleArchiveFromModal}
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {editingTag.is_archived ? "Wiederherstellen" : "Archivieren"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
