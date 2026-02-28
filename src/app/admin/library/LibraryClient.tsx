"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TaskTemplate, TaskTag, ProductTemplate } from "@/types";
import { TagsClient } from "@/app/admin/tags/TagsClient";
import { TaskTemplatesClient } from "@/app/admin/task-templates/TaskTemplatesClient";
import { ProductTemplatesClient } from "./ProductTemplatesClient";
import { FileText, Tag, Package, LayoutTemplate } from "lucide-react";

type LibraryTab = "product-templates" | "task-templates" | "tags" | "material-types";

const TABS: { id: LibraryTab; label: string; icon: React.ReactNode }[] = [
  { id: "product-templates", label: "Produkt-Vorlagen", icon: <Package className="h-4 w-4" /> },
  { id: "task-templates", label: "Aufgaben-Vorlagen", icon: <LayoutTemplate className="h-4 w-4" /> },
  { id: "tags", label: "Tags", icon: <Tag className="h-4 w-4" /> },
  { id: "material-types", label: "Material-Typen", icon: <FileText className="h-4 w-4" /> },
];

const MATERIAL_TYPES = [
  { value: "scorecard", label: "Scorecard", description: "Executive Scorecard mit Bewertungsergebnissen" },
  { value: "meeting_notes", label: "Meeting Notes", description: "Notizen aus Beratungsgesprächen und Sessions" },
  { value: "document", label: "Dokument", description: "Allgemeine Dokumente und Ressourcen" },
  { value: "product", label: "Produkt", description: "Produkt-Materialien und Lieferables aus aktivierten Produkten" },
];

interface LibraryClientProps {
  activeTab: LibraryTab;
  tags: TaskTag[];
  productTemplates: ProductTemplate[];
  taskTemplates: TaskTemplate[];
}

export function LibraryClient({ activeTab, tags, productTemplates, taskTemplates }: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTab(tab: LibraryTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/admin/library?${params.toString()}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0f2b3c]">Library</h1>
        <p className="mt-1 text-muted-foreground">
          Vorlagen, Tags und Konfigurationen verwalten
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 border-b">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 px-4 pb-3 pt-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.id
                  ? "border-[#2d8a8a] text-[#2d8a8a]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "product-templates" && (
        <ProductTemplatesClient initialTemplates={productTemplates} tags={tags} />
      )}

      {activeTab === "task-templates" && (
        <TaskTemplatesClient initialTemplates={taskTemplates} tags={tags} />
      )}

      {activeTab === "tags" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <TagsClient initialTags={tags} />
        </div>
      )}

      {activeTab === "material-types" && (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Typ</th>
                  <th className="px-4 py-3 text-left">Beschreibung</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MATERIAL_TYPES.map((t) => (
                  <tr key={t.value}>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.label}</td>
                    <td className="px-4 py-3 text-gray-500">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
