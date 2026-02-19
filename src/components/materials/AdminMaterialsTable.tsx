"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { Download, Trash2, Eye, EyeOff, FileText, Loader2 } from "lucide-react";
import { Material } from "@/types";
import { formatDate } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AdminMaterialsTableProps {
  initialMaterials: Material[];
}

export function AdminMaterialsTable({ initialMaterials }: AdminMaterialsTableProps) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    const response = await fetch(`/api/materials/${id}/download`);
    if (!response.ok) return;
    const { signedUrl } = await response.json();
    window.open(signedUrl, "_blank");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material?")) return;
    setLoadingId(id);
    const response = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    }
    setLoadingId(null);
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    setLoadingId(id);
    const response = await fetch(`/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !current }),
    });
    if (response.ok) {
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_published: !current } : m))
      );
    }
    setLoadingId(null);
  };

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">No materials yet</h3>
        <p className="text-muted-foreground">Upload materials from a customer&apos;s lead detail page.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Title</th>
            <th className="px-4 py-3 text-left font-medium">Company ID</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Size</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Uploaded</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{material.title}</span>
                </div>
                {material.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{material.description}</p>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {material.company_id.slice(0, 8)}…
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {material.mime_type === "application/pdf" ? "PDF" : "Word"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatFileSize(material.size_bytes)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={material.is_published ? "default" : "outline"}>
                  {material.is_published ? "Published" : "Draft"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(material.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {loadingId === material.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(material.id, material.is_published)}
                        title={material.is_published ? "Unpublish" : "Publish"}
                      >
                        {material.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(material.id)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(material.id)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
