"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Paperclip, CheckSquare } from "lucide-react";
import { Task, TaskTag } from "@/types";

interface TaskCardProps {
  task: Task;
  tags: TaskTag[];
  onOpenDrawer: (taskId: string) => void;
}

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status === "done") return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function TaskCard({ task, tags, onOpenDrawer }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const tag = tags.find((t) => t.id === task.tag_id);
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((s) => s.is_done).length;
  const hasAttachments = (task.attachments ?? []).length > 0;
  const overdue = isOverdue(task.deadline, task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      {/* Drag handle (full card is draggable) */}
      <div
        {...listeners}
        className="absolute inset-0 cursor-grab rounded-xl active:cursor-grabbing"
      />

      {/* Click area for drawer (on top of drag handle for pointer events) */}
      <button
        onClick={() => onOpenDrawer(task.id)}
        className="relative z-10 block w-full text-left"
      >
        {/* Tag */}
        {tag && (
          <span
            className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </span>
        )}

        {/* Title */}
        <h4 className="text-sm font-medium text-[#0f2b3c] leading-snug">{task.title}</h4>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          {task.deadline && (
            <span
              className={`flex items-center gap-1 ${
                overdue ? "font-medium text-red-600" : ""
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {overdue ? "Überfällig" : formatDeadline(task.deadline)}
            </span>
          )}
          {subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              {doneSubtasks}/{subtasks.length}
            </span>
          )}
          {hasAttachments && <Paperclip className="h-3.5 w-3.5" />}
        </div>
      </button>
    </div>
  );
}
