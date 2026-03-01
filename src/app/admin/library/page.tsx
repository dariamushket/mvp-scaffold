import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { listSharedMaterials } from "@/lib/materials";
import { TaskTemplate, TaskTag, ProductTemplate, Material } from "@/types";
import { LibraryClient } from "./LibraryClient";

type LibraryTab = "product-templates" | "task-templates" | "tags" | "material-types" | "materials";

interface LibraryPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const auth = await requireAdmin();
  if (!auth) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: LibraryTab =
    tab === "task-templates" || tab === "tags" || tab === "material-types" || tab === "materials"
      ? (tab as LibraryTab)
      : "product-templates";

  const adminClient = createAdminClient();

  const [tagsResult, productTemplatesResult, taskTemplatesResult] = await Promise.all([
    adminClient.from("task_tags").select("*").order("name"),
    adminClient
      .from("product_templates")
      .select("*, tag:task_tags(*)")
      .order("created_at", { ascending: false }),
    activeTab === "task-templates"
      ? adminClient
          .from("task_templates")
          .select("*, tag:task_tags(*)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const tags: TaskTag[] = (tagsResult.data ?? []) as TaskTag[];
  const productTemplates: ProductTemplate[] = (productTemplatesResult.data ?? []) as ProductTemplate[];
  const taskTemplates: TaskTemplate[] = (taskTemplatesResult.data ?? []) as TaskTemplate[];
  const sharedMaterials: Material[] = activeTab === "materials" ? await listSharedMaterials() : [];

  return (
    <LibraryClient
      activeTab={activeTab}
      tags={tags}
      productTemplates={productTemplates}
      taskTemplates={taskTemplates}
      sharedMaterials={sharedMaterials}
    />
  );
}
