"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Paperclip, MessageSquare } from "lucide-react";
import { Task, TaskTag, TaskStatus } from "@/types";

interface AdminTasksTreeTableProps {
  tasks: Task[];
  tags: TaskTag[];
  selectedIds: string[];
  seenTaskIds: Set<string>;
  onSelectId: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onOpenTask: (task: Task) => void;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Nicht begonnen",
  in_progress: "In Bearbeitung",
  done: "Erledigt",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AdminTasksTreeTable({
  tasks,
  tags,
  selectedIds,
  seenTaskIds,
  onSelectId,
  onSelectAll,
  onOpenTask,
}: AdminTasksTreeTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.includes(t.id));

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded"
              />
            </th>
            <th className="px-4 py-3">Titel</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Tag</th>
            <th className="px-4 py-3">Deadline</th>
            <th className="px-4 py-3">Aktualisiert</th>
            <th className="px-4 py-3 text-center">Sub</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                Keine Aufgaben vorhanden
              </td>
            </tr>
          )}
          {tasks.map((task) => {
            const isExpanded = expandedIds.has(task.id);
            const subtasks = task.subtasks ?? [];
            const hasSubtasks = subtasks.length > 0;
            const tag = tags.find((t) => t.id === task.tag_id);

            return (
              <React.Fragment key={task.id}>
                <tr
                  className={`border-b transition-colors hover:bg-gray-50 ${
                    selectedIds.includes(task.id) ? "bg-blue-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task.id)}
                      onChange={(e) => onSelectId(task.id, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {hasSubtasks ? (
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      <button
                        onClick={() => onOpenTask(task)}
                        className="font-medium text-[#0f2b3c] hover:text-[#2d8a8a] hover:underline text-left"
                      >
                        {task.title}
                      </button>
                      {(task.comment_count ?? 0) > 0 && (
                        <span className={`ml-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          seenTaskIds.has(task.id)
                            ? "bg-gray-100 text-gray-500"
                            : "bg-[#FECACA] text-red-700"
                        }`}>
                          <MessageSquare className="h-3 w-3" />
                          {task.comment_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tag ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.deadline ? (
                      <span
                        className={
                          new Date(task.deadline) < new Date() && task.status !== "done"
                            ? "text-red-600 font-medium"
                            : "text-gray-700"
                        }
                      >
                        {formatDate(task.deadline)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(task.updated_at)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {hasSubtasks ? (
                      <span className="text-xs">
                        {subtasks.filter((s) => s.is_done).length}/{subtasks.length}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>

                {/* Inline subtask rows */}
                {isExpanded &&
                  subtasks.map((sub) => {
                    const subAttachments = sub.attachments ?? [];
                    return (
                      <React.Fragment key={sub.id}>
                        <tr className="border-b bg-gray-50/50 text-xs text-gray-600">
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2 pl-6">
                              <span
                                className={`h-3 w-3 rounded-full border-2 shrink-0 ${
                                  sub.is_done ? "border-[#2d8a8a] bg-[#2d8a8a]" : "border-gray-300"
                                }`}
                              />
                              <span className={sub.is_done ? "line-through text-gray-400" : ""}>
                                {sub.title}
                              </span>
                              {subAttachments.length > 0 && (
                                <span className="ml-1 flex items-center gap-0.5 text-gray-400">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{subAttachments.length}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {sub.is_done ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Erledigt</span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Offen</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-400">—</td>
                          <td className="px-4 py-2">
                            {sub.deadline ? (
                              <span
                                className={
                                  new Date(sub.deadline) < new Date() && !sub.is_done
                                    ? "text-red-600 font-medium"
                                    : ""
                                }
                              >
                                {formatDate(sub.deadline)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-400">{formatDate(sub.updated_at)}</td>
                          <td className="px-4 py-2" />
                        </tr>
                        {subAttachments.map((att) => (
                          <tr key={att.id} className="border-b bg-gray-50/30 text-xs">
                            <td className="px-4 py-1" />
                            <td className="px-4 py-1" colSpan={6}>
                              <div className="pl-14 flex items-center gap-1.5 text-gray-500">
                                <Paperclip className="h-3 w-3 shrink-0" />
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-[#2d8a8a] hover:underline truncate"
                                >
                                  {att.label}
                                </a>
                                <span className="shrink-0 rounded-full bg-[#e6f4f4] px-1.5 py-0.5 text-[10px] font-medium text-[#2d8a8a]">
                                  {att.type === 'material' ? 'Datei' : 'Link'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
