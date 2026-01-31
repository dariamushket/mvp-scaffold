import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, Badge, Input } from "@/components/ui";
import { Search, Download, Filter, Eye, MoreHorizontal } from "lucide-react";

// TODO: Fetch actual leads from database
const MOCK_LEADS = [
  {
    id: "1",
    name: "John Smith",
    email: "john@acmecorp.com",
    company: "Acme Corp",
    score: 85,
    businessType: "SaaS Startup",
    bottleneck: "Operations",
    tags: ["hot-lead", "saas"],
    createdAt: "2024-01-15T10:30:00",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@techventures.io",
    company: "Tech Ventures",
    score: 72,
    businessType: "E-commerce",
    bottleneck: "Marketing",
    tags: ["warm-lead"],
    createdAt: "2024-01-14T14:20:00",
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "mchen@growthco.com",
    company: "GrowthCo",
    score: 91,
    businessType: "Agency",
    bottleneck: "Team",
    tags: ["hot-lead", "agency"],
    createdAt: "2024-01-13T09:15:00",
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily@startuplab.co",
    company: "Startup Lab",
    score: 65,
    businessType: "Consulting",
    bottleneck: "Sales",
    tags: ["cold-lead"],
    createdAt: "2024-01-12T16:45:00",
  },
  {
    id: "5",
    name: "David Wilson",
    email: "david@innovate.inc",
    company: "Innovate Inc",
    score: 78,
    businessType: "Manufacturing",
    bottleneck: "Operations",
    tags: ["warm-lead", "enterprise"],
    createdAt: "2024-01-11T11:00:00",
  },
];

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function getTagColor(tag: string): "default" | "secondary" | "destructive" | "outline" {
  if (tag === "hot-lead") return "destructive";
  if (tag === "warm-lead") return "secondary";
  return "outline";
}

export default function LeadsPage() {
  return (
    <div>
      <PageHeader
        title="Leads"
        description="Manage and track assessment leads"
      >
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, email, or company..." className="pl-9" />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Lead</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Bottleneck</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tags</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LEADS.map((lead) => (
                  <tr key={lead.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                        {lead.company && (
                          <div className="text-sm text-muted-foreground">{lead.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-sm font-medium ${getScoreColor(lead.score)}`}
                      >
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{lead.bottleneck}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((tag) => (
                          <Badge key={tag} variant={getTagColor(tag)} className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/leads/${lead.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing 1-{MOCK_LEADS.length} of {MOCK_LEADS.length} leads
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
