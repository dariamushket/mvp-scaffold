import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { Task, TaskTag } from "@/types";

export default async function PortalTasksPage() {
  const auth = await requireAuth();
  if (!auth) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const [tasksResult, tagsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, tag:task_tags(*), subtasks(*), attachments:task_attachments(*)")
      .order("status")
      .order("position"),
    supabase.from("task_tags").select("*").order("name"),
  ]);

  const tasks: Task[] = tasksResult.data ?? [];
  const tags: TaskTag[] = tagsResult.data ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0f2b3c]">Aufgaben</h1>
        <p className="mt-1 text-muted-foreground">
          Ihre offenen Maßnahmen zur Strategieumsetzung
        </p>
      </div>

      <KanbanBoard
        initialTasks={tasks}
        tags={tags}
        currentUserId={auth.user.id}
        currentUserRole={profile.role}
      />
    </div>
  );
}
