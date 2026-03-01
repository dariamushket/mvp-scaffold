"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Search } from "lucide-react";
import { Task, TaskTag, TaskStatus } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDrawer } from "./TaskDrawer";

interface KanbanBoardProps {
  initialTasks: Task[];
  tags: TaskTag[];
  currentUserId: string;
  currentUserRole: "admin" | "customer";
  latestAdminCommentAt?: Record<string, string>;
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "not_started", label: "Nicht begonnen", color: "#94a3b8" },
  { status: "in_progress", label: "In Bearbeitung", color: "#3b82f6" },
  { status: "done", label: "Erledigt", color: "#2d8a8a" },
];

export function KanbanBoard({
  initialTasks,
  tags,
  currentUserId,
  currentUserRole,
  latestAdminCommentAt = {},
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeDrawerTaskId, setActiveDrawerTaskId] = useState<string | null>(null);
  // taskId → JS timestamp when customer last opened that task
  const [taskSeenAt, setTaskSeenAt] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("portal_task_comment_seen") ?? "{}");
      if (stored && typeof stored === "object") setTaskSeenAt(stored);
    } catch {
      // ignore
    }
  }, []);

  function markTaskSeen(taskId: string) {
    const now = Date.now();
    setTaskSeenAt((prev) => {
      const next = { ...prev, [taskId]: now };
      try {
        localStorage.setItem("portal_task_comment_seen", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function hasNewAdminComment(taskId: string): boolean {
    const latestAt = latestAdminCommentAt[taskId];
    if (!latestAt) return false;
    return new Date(latestAt).getTime() > (taskSeenAt[taskId] ?? 0);
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterDeadline, setFilterDeadline] = useState<"overdue" | "this_week" | "">("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTag && t.tag_id !== filterTag) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterDeadline === "overdue") {
        if (!t.deadline || t.status === "done") return false;
        if (new Date(t.deadline) >= new Date()) return false;
      }
      if (filterDeadline === "this_week") {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        if (d < now || d > weekEnd) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, filterTag, filterStatus, filterDeadline]);

  function getColumnTasks(status: TaskStatus): Task[] {
    return filteredTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  async function patchTask(taskId: string, updates: Partial<Task>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Dropped over a column (status)
    const targetStatus = COLUMNS.find((c) => c.status === overId)?.status;
    if (targetStatus && activeTask.status !== targetStatus) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t))
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Dropped over a column status
    const targetStatus = COLUMNS.find((c) => c.status === overId)?.status;
    if (targetStatus) {
      const newStatus = targetStatus;
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: newStatus } : t))
      );
      patchTask(activeId, { status: newStatus });
      return;
    }

    // Dropped over another task card
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTask.status !== overTask.status) {
      // Move to different column
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: overTask.status } : t))
      );
      patchTask(activeId, { status: overTask.status });
      return;
    }

    // Reorder within same column
    const columnTasks = tasks
      .filter((t) => t.status === activeTask.status)
      .sort((a, b) => a.position - b.position);

    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const newIndex = columnTasks.findIndex((t) => t.id === overId);

    if (oldIndex !== newIndex) {
      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      const updated = reordered.map((t, i) => ({ ...t, position: i }));

      setTasks((prev) =>
        prev.map((t) => {
          const u = updated.find((u) => u.id === t.id);
          return u ?? t;
        })
      );

      // Persist positions
      updated.forEach((t) => patchTask(t.id, { position: t.position }));
    }
  }

  const activeDrawerTask = tasks.find((t) => t.id === activeDrawerTaskId) ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Aufgaben suchen…"
            className="rounded-lg border py-2 pl-9 pr-4 text-sm outline-none focus:border-[#2d8a8a] focus:ring-1 focus:ring-[#2d8a8a]"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
        >
          <option value="">Alle Status</option>
          <option value="not_started">Nicht begonnen</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="done">Erledigt</option>
        </select>

        {/* Tag filter */}
        {tags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
          >
            <option value="">Alle Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        )}

        {/* Deadline filter */}
        <select
          value={filterDeadline}
          onChange={(e) => setFilterDeadline(e.target.value as "overdue" | "this_week" | "")}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2d8a8a]"
        >
          <option value="">Alle Deadlines</option>
          <option value="overdue">Überfällig</option>
          <option value="this_week">Diese Woche</option>
        </select>

        {/* Clear filters */}
        {(searchQuery || filterTag || filterStatus || filterDeadline) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterTag("");
              setFilterStatus("");
              setFilterDeadline("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={getColumnTasks(col.status)}
              tags={tags}
              accentColor={col.color}
              hasNewComment={hasNewAdminComment}
              onOpenDrawer={(taskId) => {
                setActiveDrawerTaskId(taskId);
                markTaskSeen(taskId);
              }}
            />
          ))}
        </div>
      </DndContext>

      {/* Task drawer */}
      {activeDrawerTask && (
        <TaskDrawer
          task={activeDrawerTask}
          tags={tags}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setActiveDrawerTaskId(null)}
          onStatusChange={(taskId, status) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status } : t))
            );
          }}
          onSubtaskToggle={(taskId, subtaskId, isDone) => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      subtasks: (t.subtasks ?? []).map((s) =>
                        s.id === subtaskId ? { ...s, is_done: isDone } : s
                      ),
                    }
                  : t
              )
            );
          }}
        />
      )}
    </div>
  );
}
