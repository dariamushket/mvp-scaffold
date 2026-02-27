import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { listMaterialsForPortal } from "@/lib/materials";
import { TaskTag } from "@/types";
import { MaterialsPortalClient } from "@/components/portal/MaterialsPortalClient";

async function fetchTags(): Promise<TaskTag[]> {
  // Use internal server-side import to avoid HTTP overhead
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_tags")
    .select("*")
    .eq("is_archived", false)
    .order("name");
  return (data ?? []) as TaskTag[];
}

export default async function PortalMaterialsPage() {
  await requireAuth();
  const profile = await getProfile();

  const [materials, tags] = await Promise.all([
    profile?.company_id ? listMaterialsForPortal(profile.company_id) : Promise.resolve([]),
    fetchTags(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0f2b3c]">Materialien</h1>
        <p className="mt-1 text-muted-foreground">Ihre Ressourcen und Dokumente</p>
      </div>
      <Suspense fallback={null}>
        <MaterialsPortalClient materials={materials} tags={tags} />
      </Suspense>
    </div>
  );
}
