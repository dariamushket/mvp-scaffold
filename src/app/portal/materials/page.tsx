"use client";

import { useState } from "react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { Search, FileText, Presentation, BookOpen, Video } from "lucide-react";

type Material = {
  id: string;
  title: string;
  description: string;
  icon: "document" | "presentation" | "guide" | "video";
  iconBgColor: string;
  iconColor: string;
  actionLabel: string;
  actionUrl?: string;
};

// Mock data matching the design
const MATERIALS: Material[] = [
  {
    id: "1",
    title: "Executive Scorecard",
    description: "Ihre vollständige PSEI-Auswertung",
    icon: "document",
    iconBgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
    actionLabel: "Herunterladen",
  },
  {
    id: "2",
    title: "Strategiepräsentation",
    description: "Für Ihr Führungsteam",
    icon: "presentation",
    iconBgColor: "bg-amber-100",
    iconColor: "text-amber-600",
    actionLabel: "Herunterladen",
  },
  {
    id: "3",
    title: "Führungsleitfaden",
    description: "Best Practices für CEOs",
    icon: "guide",
    iconBgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
    actionLabel: "Herunterladen",
  },
  {
    id: "4",
    title: "Session-Aufzeichnung",
    description: "Kick-off vom 28. Januar",
    icon: "video",
    iconBgColor: "bg-purple-100",
    iconColor: "text-purple-600",
    actionLabel: "Ansehen",
  },
];

function getIcon(type: Material["icon"]) {
  switch (type) {
    case "document":
      return FileText;
    case "presentation":
      return Presentation;
    case "guide":
      return BookOpen;
    case "video":
      return Video;
    default:
      return FileText;
  }
}

export default function PortalMaterialsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaterials = MATERIALS.filter(
    (material) =>
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">Materialien</h1>
          <p className="mt-1 text-muted-foreground">
            Ihre Ressourcen und Dokumente
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Materialien suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-lg border-gray-200 pl-10"
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredMaterials.map((material) => {
          const Icon = getIcon(material.icon);
          return (
            <Card
              key={material.id}
              className="rounded-xl border bg-white shadow-sm"
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                {/* Icon */}
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-xl ${material.iconBgColor}`}
                >
                  <Icon className={`h-8 w-8 ${material.iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="mt-4 font-semibold text-[#0f2b3c]">
                  {material.title}
                </h3>

                {/* Description */}
                <p className="mt-1 text-sm text-muted-foreground">
                  {material.description}
                </p>

                {/* Action Button */}
                <Button
                  variant="outline"
                  className="mt-4 w-full rounded-lg border-gray-300 text-[#0f2b3c]"
                >
                  {material.actionLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredMaterials.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Keine Materialien gefunden für &quot;{searchQuery}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
