import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { BookOpen, Calendar, CheckSquare, TrendingUp } from "lucide-react";

// TODO: Fetch actual stats from database
const MOCK_STATS = {
  pendingTasks: 5,
  completedTasks: 12,
  upcomingSessions: 2,
  materialsAvailable: 8,
};

export default async function DashboardPage() {
  const profile = await getProfile();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${profile?.role === "admin" ? " (Admin)" : ""}`}
      />

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_STATS.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              {MOCK_STATS.completedTasks} completed this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_STATS.upcomingSessions}</div>
            <p className="text-xs text-muted-foreground">Next: Tomorrow at 2:00 PM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Materials</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_STATS.materialsAvailable}</div>
            <p className="text-xs text-muted-foreground">Resources available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72%</div>
            <p className="text-xs text-muted-foreground">Program completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/app/tasks"
              className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">View Tasks</div>
                <div className="text-sm text-muted-foreground">
                  See your pending and completed tasks
                </div>
              </div>
            </Link>
            <Link
              href="/app/sessions"
              className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Manage Sessions</div>
                <div className="text-sm text-muted-foreground">
                  View and schedule coaching sessions
                </div>
              </div>
            </Link>
            <Link
              href="/app/materials"
              className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Browse Materials</div>
                <div className="text-sm text-muted-foreground">
                  Access training videos and documents
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {/* TODO: Fetch actual activity from database */}
            <div className="space-y-4">
              {[
                { action: "Completed task", item: "Review Q4 financials", time: "2 hours ago" },
                { action: "Session scheduled", item: "Weekly check-in", time: "Yesterday" },
                { action: "Material viewed", item: "Growth Strategy Guide", time: "2 days ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <div className="text-sm font-medium">{activity.action}</div>
                    <div className="text-sm text-muted-foreground">{activity.item}</div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
