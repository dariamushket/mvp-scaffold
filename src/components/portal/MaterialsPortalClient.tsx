"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Download, FileText, ChevronRight, FolderOpen, Star, Video, Package, ArrowLeft, Search, X, CheckCircle, CalendarDays } from "lucide-react";
import { Material, MaterialType, TaskTag, LeadProduct } from "@/types";
import { Badge } from "@/components/ui";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TYPE_LABELS: Record<MaterialType, string> = {
  scorecard: "Scorecard",
  document: "Dokument",
  product: "Produkt",
  meeting_notes: "Meeting Notes",
};

async function downloadMaterial(id: string) {
  const response = await fetch(`/api/materials/${id}/download`);
  if (!response.ok) return;
  const { signedUrl } = await response.json();
  window.open(signedUrl, "_blank");
}

const TYPE_OPTIONS: { value: MaterialType | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "scorecard", label: "Scorecard" },
  { value: "meeting_notes", label: "Meeting Notes" },
  { value: "document", label: "Dokumente" },
  { value: "product", label: "Produkte" },
];

interface Props {
  materials: Material[];
  tags: TaskTag[];
  leadProducts?: LeadProduct[];
}

export function MaterialsPortalClient({ materials, tags, leadProducts = [] }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const view = searchParams.get("view");
  const tagFilter = searchParams.get("tag");
  const typeFilter = searchParams.get("type") as MaterialType | null;

  // All-materials view state (always declared — rules of hooks)
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<MaterialType | "all">("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        !search ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchType = activeType === "all" || m.type === activeType;
      const matchTag = !activeTag || m.tag_id === activeTag;
      return matchSearch && matchType && matchTag;
    });
  }, [materials, search, activeType, activeTag]);

  const navigate = (params: Record<string, string | null>) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    router.push(`?${p.toString()}`);
  };

  // ── Home view ──────────────────────────────────────────────────────────────
  if (!view && !tagFilter && !typeFilter) {
    const scorecard = materials.find((m) => m.type === "scorecard");
    const hasMeetingNotes = materials.some((m) => m.type === "meeting_notes");
    const products = materials.filter((m) => m.type === "product");

    // Only show dimension tags that actually have published materials
    const dimensionTagIds = new Set(
      materials.filter((m) => m.tag_id !== null).map((m) => m.tag_id as string)
    );
    const dimensionTags = tags.filter((t) => dimensionTagIds.has(t.id));

    return (
      <div className="space-y-10">
        {/* ESSENTIAL */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Essential
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scorecard && (
              <button
                onClick={() => downloadMaterial(scorecard.id)}
                className="group flex items-center gap-4 rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-[#0f2b3c]/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0f2b3c]">Executive Scorecard</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{scorecard.title}</p>
                </div>
                <Download className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            )}

            {hasMeetingNotes && (
              <button
                onClick={() => navigate({ type: "meeting_notes" })}
                className="group flex items-center gap-4 rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-[#0f2b3c]/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Video className="h-6 w-6 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0f2b3c]">Meeting Notes</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {materials.filter((m) => m.type === "meeting_notes").length} Dokumente
                  </p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            )}
          </div>
        </section>

        {/* DIMENSIONEN */}
        {dimensionTags.length > 0 && (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dimensionen
            </h2>
            <div className="flex flex-wrap gap-3">
              {dimensionTags.map((tag) => {
                const count = materials.filter((m) => m.tag_id === tag.id).length;
                return (
                  <button
                    key={tag.id}
                    onClick={() => navigate({ tag: tag.id })}
                    className="group flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:shadow-md"
                    style={{ borderColor: tag.color + "40" }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                    <span className="ml-1 text-xs text-muted-foreground">({count})</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PRODUKTE */}
        {(products.length > 0 || leadProducts.length > 0) && (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Produkte
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Lead product cards (announced / activated) */}
              {leadProducts.map((lp) => {
                const template = lp.product_template;
                if (!template) return null;

                if (lp.status === "announced") {
                  return (
                    <div
                      key={lp.id}
                      className="flex items-start gap-4 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 p-5 shadow-sm text-white"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                        <CalendarDays className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{template.name}</p>
                        {template.description && (
                          <p className="mt-1 text-sm text-white/80">{template.description}</p>
                        )}
                        <a
                          href="/portal/sessions"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-white/90"
                        >
                          Jetzt buchen
                        </a>
                      </div>
                    </div>
                  );
                }

                if (lp.status === "activated") {
                  return (
                    <div
                      key={lp.id}
                      className="flex items-start gap-4 rounded-xl border bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <CheckCircle className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#0f2b3c]">{template.name}</p>
                        {template.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                        )}
                        {template.tag_id && (
                          <button
                            onClick={() => navigate({ tag: template.tag_id! })}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Materialien ansehen →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Existing product-type materials */}
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-start gap-4 rounded-xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <Package className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0f2b3c]">{product.title}</p>
                    {product.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                    )}
                    <button
                      onClick={() => downloadMaterial(product.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0f2b3c] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0f2b3c]/90"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Herunterladen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alle Materialien link */}
        <div className="border-t pt-4">
          <button
            onClick={() => navigate({ view: "all" })}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[#0f2b3c] hover:underline"
          >
            <FolderOpen className="h-4 w-4" />
            Alle Materialien ansehen
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Filtered view (by tag or type) ────────────────────────────────────────
  if (tagFilter || typeFilter) {
    const tag = tagFilter ? tags.find((t) => t.id === tagFilter) : null;
    const filtered = materials.filter((m) => {
      if (tagFilter) return m.tag_id === tagFilter;
      if (typeFilter) return m.type === typeFilter;
      return true;
    });
    const heading = tag?.name ?? (typeFilter ? TYPE_LABELS[typeFilter] : "Materialien");

    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("?")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        <div className="flex items-center gap-3">
          {tag && (
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
          )}
          <h2 className="text-2xl font-bold text-[#0f2b3c]">{heading}</h2>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground">Keine Materialien in dieser Kategorie.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((material) => (
              <div
                key={material.id}
                className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#0f2b3c]">{material.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(material.size_bytes)} · {formatDate(material.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => downloadMaterial(material.id)}
                  className="shrink-0 rounded-lg border p-2 transition hover:bg-slate-50"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── All Materials view (?view=all) ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("?")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>

      <h2 className="text-2xl font-bold text-[#0f2b3c]">Alle Materialien</h2>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-9 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#0f2b3c]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveType(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeType === opt.value
                  ? "bg-[#0f2b3c] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tag filter pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !activeTag
                  ? "bg-[#0f2b3c] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Alle Tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTag === tag.id ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={activeTag === tag.id ? { backgroundColor: tag.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activeTag === tag.id ? "white" : tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {allMaterials.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Keine Materialien gefunden.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Titel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Typ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tag</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Datum</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Größe</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Download</th>
              </tr>
            </thead>
            <tbody>
              {allMaterials.map((material) => (
                <tr key={material.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-[#0f2b3c]">{material.title}</span>
                    </div>
                    {material.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {material.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
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
                    {formatDate(material.created_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatFileSize(material.size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => downloadMaterial(material.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
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
