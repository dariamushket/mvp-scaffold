"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Subtask } from "@/types";

interface SubtaskChecklistProps {
  taskId: string;
  subtasks: Subtask[];
  onUpdate: (subtaskId: string, isDone: boolean) => void;
}

function isOverdue(deadline: string | null, isDone: boolean): boolean {
  if (!deadline || isDone) return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Date(deadline).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function SubtaskChecklist({ taskId, subtasks, onUpdate }: SubtaskChecklistProps) {
  const [showAll, setShowAll] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const doneCount = subtasks.filter((s) => s.is_done).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const visible = showAll ? subtasks : subtasks.slice(0, 5);

  async function handleToggle(subtask: Subtask) {
    setUpdating(subtask.id);
    const newDone = !subtask.is_done;
    try {
      await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: newDone }),
      });
      onUpdate(subtask.id, newDone);
    } finally {
      setUpdating(null);
    }
  }

  if (subtasks.length === 0) {
    return <p className="text-sm text-gray-400">Keine Teilaufgaben</p>;
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#2d8a8a] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {doneCount} von {totalCount}
        </span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.map((subtask) => {
          const overdue = isOverdue(subtask.deadline, subtask.is_done);
          const deadlineLabel = formatDeadline(subtask.deadline);
          return (
            <div key={subtask.id} className="flex items-center gap-3">
              <button
                onClick={() => handleToggle(subtask)}
                disabled={updating === subtask.id}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors disabled:opacity-50 ${
                  subtask.is_done
                    ? "border-[#2d8a8a] bg-[#2d8a8a] text-white"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                {subtask.is_done && <Check className="h-3 w-3" />}
              </button>
              <span
                className={`flex-1 text-sm ${
                  subtask.is_done ? "line-through text-gray-400" : "text-gray-700"
                }`}
              >
                {subtask.title}
              </span>
              {deadlineLabel && (
                <span
                  className={`text-xs ${
                    overdue ? "font-medium text-red-600" : "text-gray-400"
                  }`}
                >
                  {overdue ? "Überfällig" : deadlineLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Show all toggle */}
      {subtasks.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-[#2d8a8a] hover:underline"
        >
          {showAll ? "Weniger anzeigen" : `Alle ${subtasks.length} anzeigen`}
        </button>
      )}
    </div>
  );
}
