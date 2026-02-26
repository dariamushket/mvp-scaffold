import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskTemplatesClient } from "./TaskTemplatesClient";
import { TaskTemplate, TaskTag } from "@/types";

export default async function TaskTemplatesPage() {
  const auth = await requireAdmin();
  if (!auth) redirect("/login");

  const adminClient = createAdminClient();

  const [templatesResult, tagsResult] = await Promise.all([
    adminClient
      .from("task_templates")
      .select("*, tag:task_tags(*)")
      .order("created_at", { ascending: false }),
    adminClient.from("task_tags").select("*").order("name"),
  ]);

  const templates: TaskTemplate[] = templatesResult.data ?? [];
  const tags: TaskTag[] = tagsResult.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0f2b3c]">Aufgaben-Vorlagen</h1>
        <p className="mt-1 text-muted-foreground">
          Erstellen und verwalten Sie Aufgabenvorlagen für Leads
        </p>
      </div>

      <TaskTemplatesClient initialTemplates={templates} tags={tags} />
    </div>
  );
}
