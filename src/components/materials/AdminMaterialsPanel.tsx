"use client";

import { useState } from "react";
import { Button, Badge, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Upload, Trash2, Download, Eye, EyeOff, FileText, Loader2 } from "lucide-react";
import { Material } from "@/types";
import { formatDate } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AdminMaterialsPanelProps {
  companyId: string;
  initialMaterials: Material[];
}

export function AdminMaterialsPanel({ companyId, initialMaterials }: AdminMaterialsPanelProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle);
    formData.append("description", uploadDescription);
    formData.append("company_id", companyId);

    try {
      const response = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Reload to get the full updated record
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
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

  const handleDownload = async (id: string) => {
    const response = await fetch(`/api/materials/${id}/download`);
    if (!response.ok) return;
    const { signedUrl } = await response.json();
    window.open(signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File list */}
        {materials.length > 0 ? (
          <div className="space-y-3">
            {materials.map((material) => (
              <div key={material.id} className="flex items-center gap-3 rounded-lg border p-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{material.title}</span>
                    <Badge
                      variant={material.is_published ? "default" : "outline"}
                      className="shrink-0 text-xs"
                    >
                      {material.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {material.file_name} · {formatFileSize(material.size_bytes)} ·{" "}
                    {formatDate(material.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {loadingId === material.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>
        )}

        {/* Upload form */}
        <form onSubmit={handleUpload} className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium">Upload Material</h4>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="upload-title">Title</Label>
            <Input
              id="upload-title"
              placeholder="Material title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-description">Description (optional)</Label>
            <Input
              id="upload-description"
              placeholder="Brief description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-file">File (PDF or Word, max 50 MB)</Label>
            <Input
              id="upload-file"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              required
            />
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
                Upload
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
