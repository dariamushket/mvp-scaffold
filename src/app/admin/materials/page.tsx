import { requireAdmin } from "@/lib/auth/requireRole";
import { listAllMaterials } from "@/lib/materials";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui";
import { AdminMaterialsTable } from "@/components/materials/AdminMaterialsTable";

export default async function AdminMaterialsPage() {
  const auth = await requireAdmin();
  if (!auth) return null;

  const materials = await listAllMaterials();

  return (
    <div>
      <PageHeader
        title="Materials"
        description="Manage all customer materials and uploads"
      />
      <Card>
        <CardContent className="p-0">
          <AdminMaterialsTable initialMaterials={materials} />
        </CardContent>
      </Card>
    </div>
  );
}
