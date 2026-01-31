import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Plus, Calendar, Clock, Video, ExternalLink } from "lucide-react";

// TODO: Fetch actual sessions from database
const MOCK_SESSIONS = [
  {
    id: "1",
    title: "Weekly Strategy Check-in",
    scheduledAt: "2024-01-16T14:00:00",
    durationMinutes: 60,
    status: "scheduled" as const,
    notes: null,
  },
  {
    id: "2",
    title: "Goal Setting Session",
    scheduledAt: "2024-01-23T10:00:00",
    durationMinutes: 90,
    status: "scheduled" as const,
    notes: null,
  },
  {
    id: "3",
    title: "Q4 Review & Planning",
    scheduledAt: "2024-01-09T14:00:00",
    durationMinutes: 60,
    status: "completed" as const,
    notes: "Discussed revenue goals and team expansion plans",
    recordingUrl: "#",
  },
  {
    id: "4",
    title: "Operations Deep Dive",
    scheduledAt: "2024-01-02T11:00:00",
    durationMinutes: 45,
    status: "completed" as const,
    notes: "Mapped out key processes for documentation",
    recordingUrl: "#",
  },
];

const statusConfig = {
  scheduled: { label: "Scheduled", variant: "secondary" as const },
  completed: { label: "Completed", variant: "default" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

export default function SessionsPage() {
  const upcomingSessions = MOCK_SESSIONS.filter((s) => s.status === "scheduled");
  const pastSessions = MOCK_SESSIONS.filter((s) => s.status !== "scheduled");

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="View and manage your coaching sessions"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Book Session
        </Button>
      </PageHeader>

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Upcoming Sessions</h2>
        {upcomingSessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-medium">{session.title}</h3>
                    <Badge variant={statusConfig[session.status].variant}>
                      {statusConfig[session.status].label}
                    </Badge>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(session.scheduledAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(session.scheduledAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {session.durationMinutes} min
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <Video className="mr-2 h-4 w-4" />
                      Join
                    </Button>
                    <Button variant="outline" size="sm">
                      Reschedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming sessions</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Book Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Past Sessions</h2>
        <div className="space-y-4">
          {pastSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{session.title}</h3>
                    <Badge variant={statusConfig[session.status].variant}>
                      {statusConfig[session.status].label}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(session.scheduledAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {session.durationMinutes} min
                  </div>
                  {session.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{session.notes}</p>
                  )}
                </div>

                {"recordingUrl" in session && session.recordingUrl && (
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Recording
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
