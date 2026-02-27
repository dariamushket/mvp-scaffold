import { requireAdmin } from "@/lib/auth/requireRole";
import { listSharedMaterials } from "@/lib/materials";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui";
import { AdminMaterialsTable } from "@/components/materials/AdminMaterialsTable";

export default async function AdminMaterialsPage() {
  const auth = await requireAdmin();
  if (!auth) return null;

  const materials = await listSharedMaterials();

  return (
    <div>
      <PageHeader
        title="Shared Library"
        description="Manage shared materials visible to all customers"
      />
      <Card>
        <CardContent className="p-0">
          <AdminMaterialsTable initialMaterials={materials} />
        </CardContent>
      </Card>
    </div>
  );
}
