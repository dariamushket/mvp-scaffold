"use client";

import { useState, useRef, useEffect } from "react";
import { TaskTag } from "@/types";

const COLOR_SWATCHES = [
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
];

export interface TagSelectProps {
  tags: TaskTag[];
  value: string | null;
  onChange: (tagId: string | null) => void;
  onTagCreated?: (tag: TaskTag) => void;
  placeholder?: string;
}

export function TagSelect({
  tags,
  value,
  onChange,
  onTagCreated,
  placeholder = "Kein Tag",
}: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_SWATCHES[0]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTag = tags.find((t) => t.id === value) ?? null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/task-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onTagCreated?.(data as TaskTag);
      onChange(data.id);
      setCreating(false);
      setNewName("");
      setNewColor(COLOR_SWATCHES[0]);
      setOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setCreating(false);
          setSearch("");
        }}
        className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
      >
        {selectedTag ? (
          <>
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: selectedTag.color }}
            />
            <span className="truncate">{selectedTag.name}</span>
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <svg
          className="ml-auto h-4 w-4 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-lg border bg-white shadow-lg">
          {!creating ? (
            <>
              {/* Search */}
              <div className="border-b px-2 py-1.5">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen…"
                  className="w-full rounded px-2 py-1 text-sm outline-none"
                />
              </div>

              {/* Options */}
              <div className="max-h-52 overflow-y-auto py-1">
                {/* No tag option */}
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
                >
                  — Kein Tag —
                </button>

                {filtered.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      onChange(tag.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                    {value === tag.id && (
                      <svg
                        className="ml-auto h-3.5 w-3.5 text-[#2d8a8a]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}

                {filtered.length === 0 && search && (
                  <p className="px-3 py-2 text-xs text-gray-400">Kein Ergebnis</p>
                )}
              </div>

              {/* Create option */}
              <div className="border-t">
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-[#2d8a8a] hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Neuen Tag erstellen
                </button>
              </div>
            </>
          ) : (
            /* Inline create form */
            <div className="p-3 space-y-3">
              <p className="text-sm font-medium text-gray-700">Neuer Tag</p>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
              />
              <div className="flex gap-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newColor === c ? "#0f2b3c" : "transparent",
                    }}
                  />
                ))}
              </div>
              {createError && (
                <p className="text-xs text-red-500">{createError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  className="flex-1 rounded-lg bg-[#2d8a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-50"
                >
                  {saving ? "…" : "Speichern"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                    setNewColor(COLOR_SWATCHES[0]);
                    setCreateError(null);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
