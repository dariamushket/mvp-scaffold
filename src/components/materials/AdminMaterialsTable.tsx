"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Input, Label } from "@/components/ui";
import { Download, Trash2, Eye, EyeOff, FileText, Loader2, Upload } from "lucide-react";
import { Material, MaterialType, TaskTag } from "@/types";
import { formatDate } from "@/lib/utils";
import { TagSelect } from "@/components/ui/TagSelect";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_LABELS: Record<MaterialType, string> = {
  scorecard: "Scorecard",
  document: "Document",
  product: "Product",
  meeting_notes: "Meeting Notes",
};

const UPLOAD_TYPES: { value: MaterialType; label: string }[] = [
  { value: "scorecard", label: "Scorecard" },
  { value: "document", label: "Document" },
  { value: "product", label: "Product" },
];

interface AdminMaterialsTableProps {
  initialMaterials: Material[];
}

export function AdminMaterialsTable({ initialMaterials }: AdminMaterialsTableProps) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [tags, setTags] = useState<TaskTag[]>([]);

  // Upload form state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadType, setUploadType] = useState<MaterialType>("document");
  const [uploadTagId, setUploadTagId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/task-tags")
      .then((r) => r.json())
      .then((data) => setTags(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

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

  const handleTagCreated = (newTag: TaskTag) => {
    setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle);
    formData.append("description", uploadDescription);
    formData.append("type", uploadType);
    // No company_id → shared material
    if (uploadTagId) formData.append("tag_id", uploadTagId);

    try {
      const response = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      window.location.reload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  return (
    <div>
      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="border-b px-4 py-4 space-y-3 bg-muted/30"
      >
        <h4 className="text-sm font-semibold">Upload Shared Material</h4>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="sh-title">Title</Label>
            <Input
              id="sh-title"
              placeholder="Material title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sh-desc">Description (optional)</Label>
            <Input
              id="sh-desc"
              placeholder="Brief description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sh-type">Type</Label>
            <select
              id="sh-type"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as MaterialType)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {UPLOAD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Tag (optional)</Label>
            <TagSelect
              tags={tags}
              value={uploadTagId}
              onChange={setUploadTagId}
              onTagCreated={handleTagCreated}
              placeholder="Tag zuweisen…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sh-file">File (PDF or Word, max 50 MB)</Label>
            <Input
              id="sh-file"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={isUploading || !uploadFile || !uploadTitle}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload to Shared Library
            </>
          )}
        </Button>
      </form>

      {/* Table */}
      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No shared materials yet</h3>
          <p className="text-muted-foreground">Upload materials above to make them available to all customers.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Tag</th>
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
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {TYPE_LABELS[material.type] ?? material.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {material.tag ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: material.tag.color }}
                      >
                        {material.tag.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
      )}
    </div>
  );
}
