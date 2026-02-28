import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { listMaterialsForPortal } from "@/lib/materials";
import { TaskTag, LeadProduct } from "@/types";
import { MaterialsPortalClient } from "@/components/portal/MaterialsPortalClient";
import { createClient } from "@/lib/supabase/server";

async function fetchTags(): Promise<TaskTag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_tags")
    .select("*")
    .eq("is_archived", false)
    .order("name");
  return (data ?? []) as TaskTag[];
}

async function fetchLeadProducts(companyId: string): Promise<LeadProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_products")
    .select("*, product_template:product_templates(*, tag:task_tags(*))")
    .eq("lead_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadProduct[];
}

export default async function PortalMaterialsPage() {
  await requireAuth();
  const profile = await getProfile();

  const [materials, tags, leadProducts] = await Promise.all([
    profile?.company_id ? listMaterialsForPortal(profile.company_id) : Promise.resolve([]),
    fetchTags(),
    profile?.company_id ? fetchLeadProducts(profile.company_id) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0f2b3c]">Materialien</h1>
        <p className="mt-1 text-muted-foreground">Ihre Ressourcen und Dokumente</p>
      </div>
      <Suspense fallback={null}>
        <MaterialsPortalClient materials={materials} tags={tags} leadProducts={leadProducts} />
      </Suspense>
    </div>
  );
}
