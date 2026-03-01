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

  // Build map of taskId → latest admin comment timestamp
  // author_id → auth.users FK (not profiles), so look up roles separately
  const latestAdminCommentAt: Record<string, string> = {};
  if (tasks.length > 0) {
    const taskIds = tasks.map((t) => t.id);
    const { data: commentRows } = await supabase
      .from("task_comments")
      .select("task_id, author_id, created_at")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (commentRows && commentRows.length > 0) {
      const authorIds = Array.from(
        new Set(commentRows.map((c: { author_id: string }) => c.author_id))
      ) as string[];
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, role")
        .in("id", authorIds);
      const roleMap = Object.fromEntries(
        (profileRows ?? []).map((p: { id: string; role: string }) => [p.id, p.role])
      );
      for (const c of commentRows as { task_id: string; author_id: string; created_at: string }[]) {
        if (roleMap[c.author_id] === "admin") {
          if (!latestAdminCommentAt[c.task_id] || c.created_at > latestAdminCommentAt[c.task_id]) {
            latestAdminCommentAt[c.task_id] = c.created_at;
          }
        }
      }
    }
  }

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
        latestAdminCommentAt={latestAdminCommentAt}
      />
    </div>
  );
}
