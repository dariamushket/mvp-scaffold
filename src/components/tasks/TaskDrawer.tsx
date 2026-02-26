"use client";

import { useState } from "react";
import { X, Calendar, Tag, Check } from "lucide-react";
import { Task, TaskStatus, TaskTag, Subtask } from "@/types";
import { SubtaskChecklist } from "./SubtaskChecklist";
import { CommentThread } from "./CommentThread";
import { AttachmentList } from "./AttachmentList";

interface TaskDrawerProps {
  task: Task;
  tags: TaskTag[];
  currentUserId: string;
  currentUserRole: "admin" | "customer";
  onClose: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string, isDone: boolean) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Nicht begonnen", color: "bg-gray-100 text-gray-600" },
  { value: "in_progress", label: "In Bearbeitung", color: "bg-blue-100 text-blue-700" },
  { value: "done", label: "Erledigt", color: "bg-green-100 text-green-700" },
];

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(deadline: string | null, status: TaskStatus): boolean {
  if (!deadline || status === "done") return false;
  return new Date(deadline) < new Date();
}

export function TaskDrawer({
  task,
  tags,
  currentUserId,
  currentUserRole,
  onClose,
  onStatusChange,
  onSubtaskToggle,
}: TaskDrawerProps) {
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks ?? []);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const tag = tags.find((t) => t.id === task.tag_id);
  const deadlineLabel = formatDate(task.deadline);
  const overdue = isOverdue(task.deadline, currentStatus);

  async function handleStatusChange(newStatus: TaskStatus) {
    setUpdatingStatus(true);
    setCurrentStatus(newStatus);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChange(task.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleSubtaskUpdate(subtaskId: string, isDone: boolean) {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, is_done: isDone } : s))
    );
    onSubtaskToggle(task.id, subtaskId, isDone);
  }

  const statusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-5">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-[#0f2b3c] leading-snug">{task.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Status dropdown */}
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={updatingStatus}
                className={`rounded-full px-3 py-1 text-xs font-medium border-0 outline-none cursor-pointer ${statusOption.color}`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* Tag */}
              {tag && (
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  <Tag className="h-3 w-3" />
                  {tag.name}
                </span>
              )}

              {/* Deadline */}
              {deadlineLabel && (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    overdue ? "font-medium text-red-600" : "text-gray-500"
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {overdue ? `Überfällig: ${deadlineLabel}` : deadlineLabel}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-1 shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-5">
            {/* Description */}
            {task.description && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Beschreibung</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Subtasks */}
            {subtasks.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400">Teilaufgaben</h3>
                <SubtaskChecklist
                  taskId={task.id}
                  subtasks={subtasks}
                  onUpdate={handleSubtaskUpdate}
                />
              </div>
            )}

            {/* Attachments */}
            {(task.attachments ?? []).length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400">Anhänge</h3>
                <AttachmentList attachments={task.attachments ?? []} />
              </div>
            )}

            {/* Comments */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400">Kommentare</h3>
              <CommentThread
                taskId={task.id}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        {currentStatus !== "done" && (
          <div className="border-t p-4">
            <button
              onClick={() => handleStatusChange("done")}
              disabled={updatingStatus}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2d8a8a] py-3 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Als erledigt markieren
            </button>
          </div>
        )}
      </div>
    </>
  );
}
