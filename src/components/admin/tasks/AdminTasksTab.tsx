"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, LayoutTemplate, Tag } from "lucide-react";
import { Task, TaskTag, TaskStatus } from "@/types";
import { AdminTasksTreeTable } from "./AdminTasksTreeTable";
import { TaskEditorModal } from "./TaskEditorModal";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { DeleteTaskModal } from "./DeleteTaskModal";
import { UseTemplateModal } from "./UseTemplateModal";

interface AdminTasksTabProps {
  companyId: string;
}

export function AdminTasksTab({ companyId }: AdminTasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  // Modals
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const [tasksRes, tagsRes] = await Promise.all([
      fetch(`/api/tasks?company_id=${companyId}`),
      fetch("/api/task-tags"),
    ]);
    if (tasksRes.ok) setTasks(await tasksRes.json());
    if (tagsRes.ok) setTags(await tagsRes.json());
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  function handleSelectId(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? tasks.map((t) => t.id) : []);
  }

  // Bulk actions
  async function bulkUpdateStatus(status: TaskStatus) {
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setSelectedIds([]);
    await loadTasks();
  }

  async function bulkUpdateDeadline(deadline: string) {
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deadline }),
        })
      )
    );
    setSelectedIds([]);
    await loadTasks();
  }

  async function bulkUpdateTag(tagId: string | null) {
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag_id: tagId }),
        })
      )
    );
    setSelectedIds([]);
    await loadTasks();
  }

  async function bulkDelete() {
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/tasks/${id}`, { method: "DELETE" })
      )
    );
    setSelectedIds([]);
    await loadTasks();
  }

  async function handleDeleteTask() {
    if (!deletingTask) return;
    await fetch(`/api/tasks/${deletingTask.id}`, { method: "DELETE" });
    setDeletingTask(null);
    await loadTasks();
  }

  const filteredTasks = filterTagId
    ? tasks.filter((t) => t.tag_id === filterTagId)
    : tasks;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#0f2b3c]">Aufgaben</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTemplate(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Tag className="h-4 w-4" />
            Vorlage erstellen
          </button>
          <button
            onClick={() => setShowUseTemplate(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <LayoutTemplate className="h-4 w-4" />
            Vorlage nutzen
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2d8a8a] px-3 py-2 text-sm font-medium text-white hover:bg-[#267878]"
          >
            <Plus className="h-4 w-4" />
            Neue Aufgabe
          </button>
        </div>
      </div>

      {/* Tag filter pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTagId(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterTagId === null
                ? "bg-[#0f2b3c] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Alle
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterTagId === tag.id ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={filterTagId === tag.id ? { backgroundColor: tag.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: filterTagId === tag.id ? "white" : tag.color }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">Lade Aufgaben…</div>
      ) : (
        <AdminTasksTreeTable
          tasks={filteredTasks}
          tags={tags}
          selectedIds={selectedIds}
          onSelectId={handleSelectId}
          onSelectAll={handleSelectAll}
          onOpenTask={(task) => setEditingTask(task)}
        />
      )}

      {/* Bulk toolbar */}
      {selectedIds.length > 0 && (
        <BulkActionToolbar
          selectedIds={selectedIds}
          tags={tags}
          onStatusChange={bulkUpdateStatus}
          onDeadlineChange={bulkUpdateDeadline}
          onTagChange={bulkUpdateTag}
          onDelete={bulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <TaskEditorModal
          mode="task"
          companyId={companyId}
          tags={tags}
          onSave={async () => {
            setShowCreateTask(false);
            await loadTasks();
          }}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskEditorModal
          mode="task"
          companyId={companyId}
          tags={tags}
          initialTask={editingTask}
          onSave={async () => {
            setEditingTask(null);
            await loadTasks();
          }}
          onDelete={(taskId) => {
            setEditingTask(null);
            setDeletingTask(tasks.find((t) => t.id === taskId) ?? null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingTask && (
        <DeleteTaskModal
          taskTitle={deletingTask.title}
          onConfirm={handleDeleteTask}
          onClose={() => setDeletingTask(null)}
        />
      )}

      {/* Use Template Modal */}
      {showUseTemplate && (
        <UseTemplateModal
          companyId={companyId}
          onSuccess={async () => {
            setShowUseTemplate(false);
            await loadTasks();
          }}
          onClose={() => setShowUseTemplate(false)}
        />
      )}

      {/* Create Template Modal (shortcut — opens template editor) */}
      {showCreateTemplate && (
        <TaskEditorModal
          mode="template"
          tags={tags}
          onSave={() => setShowCreateTemplate(false)}
          onClose={() => setShowCreateTemplate(false)}
        />
      )}
    </div>
  );
}
