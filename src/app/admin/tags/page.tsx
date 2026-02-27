import { requireAdmin } from "@/lib/auth/requireRole";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TagsClient } from "./TagsClient";
import { TaskTag } from "@/types";

export default async function TagsPage() {
  const auth = await requireAdmin();
  if (!auth) redirect("/login");

  const { data } = await createAdminClient()
    .from("task_tags")
    .select("*")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <TagsClient initialTags={(data ?? []) as TaskTag[]} />
    </div>
  );
}
