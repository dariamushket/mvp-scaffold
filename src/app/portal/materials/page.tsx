import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { listMaterialsForPortal } from "@/lib/materials";
import { TaskTag, LeadProduct } from "@/types";
import { MaterialsPortalClient } from "@/components/portal/MaterialsPortalClient";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createAdminClient();
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

  // Find the latest admin-uploaded material timestamp for the badge
  // uploaded_by → auth.users FK (not profiles), so look up roles separately
  let latestAdminMaterialAt: string | null = null;
  if (profile?.company_id) {
    const adminClient = createAdminClient();
    const { data: matRows } = await adminClient
      .from("materials")
      .select("created_at, uploaded_by")
      .eq("company_id", profile.company_id)
      .eq("is_published", true)
      .eq("is_placeholder", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (matRows && matRows.length > 0) {
      const uploaderIds = Array.from(
        new Set(matRows.map((m: { uploaded_by: string }) => m.uploaded_by))
      ) as string[];
      const { data: profileRows } = await adminClient
        .from("profiles")
        .select("id, role")
        .in("id", uploaderIds);
      const roleMap = Object.fromEntries(
        (profileRows ?? []).map((p: { id: string; role: string }) => [p.id, p.role])
      );
      const latestAdminMat = (matRows as { created_at: string; uploaded_by: string }[]).find(
        (m) => roleMap[m.uploaded_by] === "admin"
      );
      latestAdminMaterialAt = latestAdminMat?.created_at ?? null;
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0f2b3c]">Materialien</h1>
        <p className="mt-1 text-muted-foreground">Ihre Ressourcen und Dokumente</p>
      </div>
      <Suspense fallback={null}>
        <MaterialsPortalClient
          materials={materials}
          tags={tags}
          leadProducts={leadProducts}
          latestAdminMaterialAt={latestAdminMaterialAt}
        />
      </Suspense>
    </div>
  );
}
