"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Upload, Trash2, Download, Eye, EyeOff, FileText, Loader2 } from "lucide-react";
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

// Exclude meeting_notes from upload form — those come via SessionEditorModal
const UPLOAD_TYPES: { value: MaterialType; label: string }[] = [
  { value: "scorecard", label: "Scorecard" },
  { value: "document", label: "Document" },
  { value: "product", label: "Product" },
];

interface AdminMaterialsPanelProps {
  companyId: string;
  initialMaterials: Material[];
}

export function AdminMaterialsPanel({ companyId, initialMaterials }: AdminMaterialsPanelProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadType, setUploadType] = useState<MaterialType>("document");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTagId, setUploadTagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/task-tags")
      .then((r) => r.json())
      .then((data) => setTags(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const placeholderMaterials = materials.filter((m) => m.is_placeholder);
  const realMaterials = materials.filter((m) => !m.is_placeholder);

  const filteredMaterials = filterTagId
    ? realMaterials.filter((m) => m.tag_id === filterTagId)
    : realMaterials;

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
    formData.append("type", uploadType);
    if (uploadTagId) formData.append("tag_id", uploadTagId);

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

  const handleTagChange = async (id: string, tagId: string | null) => {
    const response = await fetch(`/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagId }),
    });
    if (response.ok) {
      const newTag = tags.find((t) => t.id === tagId) ?? null;
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, tag_id: tagId, tag: newTag } : m
        )
      );
    }
  };

  const handleTagCreated = (newTag: TaskTag) => {
    setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
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
        {/* Tag filter pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTagId(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterTagId === null
                  ? "bg-[#0f2b3c] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Alle
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterTagId === tag.id ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={filterTagId === tag.id ? { backgroundColor: tag.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: filterTagId === tag.id ? "white" : tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* File list */}
        {filteredMaterials.length > 0 ? (
          <div className="space-y-3">
            {filteredMaterials.map((material) => (
              <div key={material.id} className="flex items-start gap-3 rounded-lg border p-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate text-sm font-medium">{material.title}</span>
                    <Badge variant="outline" className="shrink-0 text-xs capitalize">
                      {TYPE_LABELS[material.type] ?? material.type}
                    </Badge>
                    <Badge
                      variant={material.is_published ? "default" : "outline"}
                      className="shrink-0 text-xs"
                    >
                      {material.is_published ? "Published" : "Draft"}
                    </Badge>
                    {material.tag && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: material.tag.color }}
                      >
                        {material.tag.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {material.file_name} · {formatFileSize(material.size_bytes)} ·{" "}
                    {formatDate(material.created_at)}
                  </div>
                  {/* Inline tag selector */}
                  <div className="max-w-[200px]">
                    <TagSelect
                      tags={tags}
                      value={material.tag_id}
                      onChange={(tagId) => handleTagChange(material.id, tagId)}
                      onTagCreated={handleTagCreated}
                      placeholder="Tag zuweisen…"
                    />
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

        {/* Placeholder materials */}
        {placeholderMaterials.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-medium text-amber-700 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Ausstehende Uploads ({placeholderMaterials.length})
            </h4>
            <div className="space-y-2">
              {placeholderMaterials.map((material) => (
                <div key={material.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <FileText className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-sm font-medium text-amber-800">{material.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="shrink-0 text-xs capitalize border-amber-300 text-amber-700">
                        {TYPE_LABELS[material.type] ?? material.type}
                      </Badge>
                      <span className="text-xs text-amber-600">Platzhalter — Datei ausstehend</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                    title="Entfernen"
                    className="text-amber-700 border-amber-300 hover:bg-amber-100 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
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
            <Label htmlFor="upload-type">Type</Label>
            <select
              id="upload-type"
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
          <div className="space-y-2">
            <Label>Tag (optional)</Label>
            <TagSelect
              tags={tags}
              value={uploadTagId}
              onChange={setUploadTagId}
              onTagCreated={handleTagCreated}
              placeholder="Tag zuweisen…"
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
