"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { TaskStatus, TaskTag } from "@/types";

interface BulkActionToolbarProps {
  selectedIds: string[];
  tags: TaskTag[];
  onStatusChange: (status: TaskStatus) => Promise<void>;
  onDeadlineChange: (deadline: string) => Promise<void>;
  onTagChange: (tagId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
  onClear: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Nicht begonnen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "done", label: "Erledigt" },
];

export function BulkActionToolbar({
  selectedIds,
  tags,
  onStatusChange,
  onDeadlineChange,
  onTagChange,
  onDelete,
  onClear,
}: BulkActionToolbarProps) {
  const [loading, setLoading] = useState(false);

  if (selectedIds.length === 0) return null;

  async function wrap(fn: () => Promise<void>) {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl bg-[#0f2b3c] px-5 py-3 text-white shadow-2xl">
        <span className="text-sm font-medium">
          {selectedIds.length} ausgewählt
        </span>
        <span className="text-white/40">|</span>

        {/* Status */}
        <select
          disabled={loading}
          onChange={(e) => wrap(() => onStatusChange(e.target.value as TaskStatus))}
          defaultValue=""
          className="bg-transparent text-sm text-white outline-none cursor-pointer"
        >
          <option value="" disabled>Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value} className="text-black">
              {s.label}
            </option>
          ))}
        </select>

        <span className="text-white/40">|</span>

        {/* Deadline */}
        <input
          type="date"
          disabled={loading}
          onChange={(e) => e.target.value && wrap(() => onDeadlineChange(e.target.value))}
          className="bg-transparent text-sm text-white outline-none cursor-pointer [color-scheme:dark]"
          placeholder="Deadline"
          title="Deadline"
        />

        <span className="text-white/40">|</span>

        {/* Tag */}
        <select
          disabled={loading}
          onChange={(e) => wrap(() => onTagChange(e.target.value || null))}
          defaultValue=""
          className="bg-transparent text-sm text-white outline-none cursor-pointer"
        >
          <option value="" disabled>Tag</option>
          <option value="" className="text-black">Kein Tag</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id} className="text-black">
              {tag.name}
            </option>
          ))}
        </select>

        <span className="text-white/40">|</span>

        {/* Delete */}
        <button
          disabled={loading}
          onClick={() => wrap(onDelete)}
          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          Löschen
        </button>

        {/* Close */}
        <button
          onClick={onClear}
          className="ml-1 text-white/60 hover:text-white"
          title="Auswahl aufheben"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
