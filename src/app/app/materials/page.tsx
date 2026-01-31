import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, Badge, Input } from "@/components/ui";
import { Search, FileText, Video, Link as LinkIcon, ExternalLink, Download } from "lucide-react";

// TODO: Fetch actual materials from database
const MOCK_MATERIALS = [
  {
    id: "1",
    title: "Growth Strategy Playbook",
    description: "A comprehensive guide to scaling your business systematically",
    type: "document" as const,
    url: "#",
    thumbnailUrl: null,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    title: "Leadership Fundamentals",
    description: "Video series on building and leading high-performing teams",
    type: "video" as const,
    url: "#",
    thumbnailUrl: null,
    createdAt: "2024-01-05",
  },
  {
    id: "3",
    title: "Financial Planning Template",
    description: "Excel template for annual budgeting and forecasting",
    type: "document" as const,
    url: "#",
    thumbnailUrl: null,
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    title: "Marketing Automation Guide",
    description: "Learn to set up automated marketing funnels",
    type: "link" as const,
    url: "#",
    thumbnailUrl: null,
    createdAt: "2024-01-10",
  },
  {
    id: "5",
    title: "Operations Checklist",
    description: "Daily and weekly operations checklist for managers",
    type: "document" as const,
    url: "#",
    thumbnailUrl: null,
    createdAt: "2024-01-12",
  },
  {
    id: "6",
    title: "Sales Training Workshop",
    description: "Recording of our sales techniques workshop",
    type: "video" as const,
    url: "#",
    thumbnailUrl: null,
    createdAt: "2024-01-14",
  },
];

const typeConfig = {
  document: { label: "Document", icon: FileText, color: "text-blue-500" },
  video: { label: "Video", icon: Video, color: "text-red-500" },
  link: { label: "Link", icon: LinkIcon, color: "text-green-500" },
};

export default function MaterialsPage() {
  return (
    <div>
      <PageHeader
        title="Materials"
        description="Access training resources, templates, and guides"
      />

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search materials..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            All
          </Button>
          <Button variant="ghost" size="sm">
            Documents
          </Button>
          <Button variant="ghost" size="sm">
            Videos
          </Button>
          <Button variant="ghost" size="sm">
            Links
          </Button>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_MATERIALS.map((material) => {
          const config = typeConfig[material.type];
          const TypeIcon = config.icon;

          return (
            <Card key={material.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted`}>
                    <TypeIcon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <Badge variant="outline">{config.label}</Badge>
                </div>

                <h3 className="mb-1 font-medium line-clamp-1">{material.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                  {material.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(material.createdAt).toLocaleDateString()}
                  </span>
                  <Button variant="ghost" size="sm">
                    {material.type === "link" ? (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State Placeholder */}
      {MOCK_MATERIALS.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No materials available</h3>
            <p className="text-muted-foreground">
              Materials will appear here when they are added to your account
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
