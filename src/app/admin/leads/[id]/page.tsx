import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Label } from "@/components/ui";
import { ArrowLeft, Download, Mail, Phone, Building2, Tag, Save, Trash2 } from "lucide-react";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

// TODO: Fetch actual lead from database
async function getLead(id: string) {
  // This would be a database call in production
  return {
    id,
    name: "John Smith",
    email: "john@acmecorp.com",
    company: "Acme Corp",
    phone: "+1 (555) 123-4567",
    score: 85,
    businessType: "SaaS Startup",
    bottleneck: "Operations & Systems",
    tags: ["hot-lead", "saas", "series-a"],
    notes: "Very engaged during assessment. Has a team of 15 and looking to scale operations. Budget approved for Q1.",
    consentMarketing: true,
    createdAt: "2024-01-15T10:30:00",
    updatedAt: "2024-01-16T14:20:00",
    assessmentAnswers: {
      revenue: "$500K - $1M",
      teamSize: "11-25",
      industry: "Technology",
      mainChallenge: "Scaling operations while maintaining quality",
    },
  };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const lead = await getLead(id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/leads"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leads
        </Link>
      </div>

      <PageHeader title={lead.name} description={`Lead ID: ${lead.id}`}>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <a href={`mailto:${lead.email}`} className="font-medium hover:underline">
                    {lead.email}
                  </a>
                </div>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <a href={`tel:${lead.phone}`} className="font-medium hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Company</div>
                    <div className="font-medium">{lead.company}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Marketing Consent</div>
                  <div className="font-medium">{lead.consentMarketing ? "Yes" : "No"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Results */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{lead.score}</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-lg font-semibold">{lead.businessType}</div>
                  <div className="text-sm text-muted-foreground">Business Type</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-lg font-semibold">{lead.bottleneck}</div>
                  <div className="text-sm text-muted-foreground">Primary Bottleneck</div>
                </div>
              </div>

              <h4 className="mb-3 font-medium">Assessment Answers</h4>
              <div className="space-y-3">
                {Object.entries(lead.assessmentAnswers).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="min-h-[120px] w-full rounded-lg border bg-transparent p-3 text-sm"
                placeholder="Add notes about this lead..."
                defaultValue={lead.notes || ""}
              />
              <div className="mt-3 flex justify-end">
                <Button size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                    {tag}
                    <button className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add tag..." className="flex-1" />
                <Button size="sm" variant="outline">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Input id="source" placeholder="e.g., Google Ads, Referral" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner">Assigned To</Label>
                <Input id="owner" placeholder="Team member name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option>New</option>
                  <option>Contacted</option>
                  <option>Qualified</option>
                  <option>Converted</option>
                  <option>Lost</option>
                </select>
              </div>
              <Button className="w-full" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(lead.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(lead.updatedAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Lead
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
