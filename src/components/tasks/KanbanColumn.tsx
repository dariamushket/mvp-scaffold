"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Task, TaskTag, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  tags: TaskTag[];
  accentColor: string;
  onOpenDrawer: (taskId: string) => void;
  onAddTask?: () => void;
}

export function KanbanColumn({
  status,
  label,
  tasks,
  tags,
  accentColor,
  onOpenDrawer,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-[300px] flex-1 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-sm font-semibold text-[#0f2b3c]">{label}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="text-gray-400 hover:text-[#2d8a8a]"
            title="Aufgabe hinzufügen"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-1 flex-col gap-3 rounded-xl p-3 transition-colors min-h-[200px] ${
            isOver
              ? "bg-[#2d8a8a]/10 ring-2 ring-[#2d8a8a]/30"
              : "bg-gray-50/80"
          }`}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400">Aufgaben hierher ziehen</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                tags={tags}
                onOpenDrawer={onOpenDrawer}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
