"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { Check } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  completedDate?: string;
  completed: boolean;
};

// Mock data matching the design
const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "Führungsleitbild definieren",
    description: "Erstellen Sie ein Leitbild für Ihre Führungskultur",
    dueDate: "15. Feb",
    completed: false,
  },
  {
    id: "2",
    title: "Talentgespräche planen",
    description: "Vereinbaren Sie 1:1 Gespräche mit Ihren Top-Talenten",
    dueDate: "20. Feb",
    completed: false,
  },
  {
    id: "3",
    title: "Strategiedokument lesen",
    description: "Lesen Sie die Strategieempfehlungen aus Ihrem Assessment",
    completedDate: "5. Feb",
    completed: true,
  },
  {
    id: "4",
    title: "OKR-Workshop vorbereiten",
    description: "Bereiten Sie den Workshop für Ihre Führungskräfte vor",
    dueDate: "28. Feb",
    completed: false,
  },
];

export default function PortalTasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedDate: !task.completed ? new Date().toLocaleDateString("de-DE", { day: "numeric", month: "short" }).replace(".", "") : undefined,
              dueDate: task.completed ? task.dueDate : undefined,
            }
          : task
      )
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">Aufgaben</h1>
          <p className="mt-1 text-muted-foreground">
            Ihre offenen Maßnahmen zur Strategieumsetzung
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#0f2b3c]">
            {completedCount} von {totalCount} erledigt
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#2d8a8a] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`rounded-xl border shadow-sm transition-colors ${
              task.completed ? "bg-[#e8f5f5]" : "bg-white"
            }`}
          >
            <CardContent className="flex items-center gap-4 p-5">
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  task.completed
                    ? "border-[#2d8a8a] bg-[#2d8a8a] text-white"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                {task.completed && <Check className="h-4 w-4" />}
              </button>

              {/* Checkbox label (for accessibility) */}
              <span className="sr-only">Checkbox label</span>

              {/* Task Content */}
              <div className="flex-1">
                <h3
                  className={`font-medium ${
                    task.completed ? "text-[#2d8a8a]" : "text-[#0f2b3c]"
                  }`}
                >
                  {task.title}
                </h3>
                <p
                  className={`mt-0.5 text-sm ${
                    task.completed ? "text-[#2d8a8a]/70" : "text-muted-foreground"
                  }`}
                >
                  {task.description}
                </p>
              </div>

              {/* Date & Status */}
              <div className="flex items-center gap-3 text-sm">
                {task.completed ? (
                  <>
                    <span className="text-[#2d8a8a]">
                      Erledigt: {task.completedDate}
                    </span>
                    <span className="rounded-full bg-[#2d8a8a] px-3 py-1 text-xs font-medium text-white">
                      Erledigt
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      Fällig: {task.dueDate}
                    </span>
                    <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                      Offen
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
