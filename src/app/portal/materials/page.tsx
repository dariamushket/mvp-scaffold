import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { listMaterialsByCompany } from "@/lib/materials";
import { Card, CardContent } from "@/components/ui";
import { FileText, Video, BookOpen } from "lucide-react";
import { Material } from "@/types";
import { MaterialsSearch } from "@/components/materials/MaterialsSearch";
import { DownloadButton } from "@/components/materials/DownloadButton";

function getMimeIcon(mimeType: string) {
  if (mimeType.includes("video")) return Video;
  if (mimeType.includes("word")) return BookOpen;
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PortalMaterialsPage({ searchParams }: PageProps) {
  await requireAuth();
  const profile = await getProfile();

  let materials: Material[] = [];
  if (profile?.company_id) {
    materials = await listMaterialsByCompany(profile.company_id);
  }

  const { q } = await searchParams;
  const query = q?.toLowerCase() ?? "";

  const filtered = query
    ? materials.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          (m.description?.toLowerCase().includes(query) ?? false)
      )
    : materials;

  return (
    <div>
      {/* Header with search */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">Materials</h1>
          <p className="mt-1 text-muted-foreground">Your resources and documents</p>
        </div>
        <Suspense fallback={null}>
          <MaterialsSearch />
        </Suspense>
      </div>

      {/* Materials grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((material) => {
            const Icon = getMimeIcon(material.mime_type);
            return (
              <Card key={material.id} className="rounded-xl border bg-white shadow-sm">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-100">
                    <Icon className="h-8 w-8 text-cyan-600" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#0f2b3c]">{material.title}</h3>
                  {material.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{material.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatFileSize(material.size_bytes)}
                  </p>
                  <DownloadButton materialId={material.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 text-center">
          {query ? (
            <p className="text-muted-foreground">No materials found for &quot;{q}&quot;</p>
          ) : (
            <div className="flex flex-col items-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No materials available</p>
              <p className="mt-1 text-muted-foreground">
                Materials will appear here when they are added to your account.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
