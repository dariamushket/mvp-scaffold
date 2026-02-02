"use client";

import { Button, Card, CardContent } from "@/components/ui";

const BOOKING_URL = "https://calendly.com/psei/executive-diagnose";

type Session = {
  id: string;
  day: string;
  month: string;
  title: string;
  time?: string;
  location?: string;
  status: "upcoming" | "past";
  hasRecording?: boolean;
};

// Mock data matching the design
const SESSIONS: Session[] = [
  {
    id: "1",
    day: "12",
    month: "Februar",
    title: "Strategiegespräch: Führungskultur",
    time: "14:00 - 15:00 Uhr",
    location: "Online via Zoom",
    status: "upcoming",
  },
  {
    id: "2",
    day: "26",
    month: "Februar",
    title: "Workshop: OKR-Implementierung",
    time: "10:00 - 12:00 Uhr",
    location: "Vor Ort",
    status: "upcoming",
  },
  {
    id: "3",
    day: "28",
    month: "Januar",
    title: "Kick-off: PSEI Assessment Review",
    status: "past",
    hasRecording: true,
  },
];

export default function PortalSessionsPage() {
  const upcomingSessions = SESSIONS.filter((s) => s.status === "upcoming");
  const pastSessions = SESSIONS.filter((s) => s.status === "past");

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">Sessions</h1>
          <p className="mt-1 text-muted-foreground">
            Ihre geplanten Beratungsgespräche
          </p>
        </div>
        <Button
          asChild
          className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
        >
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            Session buchen
          </a>
        </Button>
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
          Kommende Sessions
        </h2>
        <div className="space-y-3">
          {upcomingSessions.map((session) => (
            <Card key={session.id} className="rounded-xl border bg-white shadow-sm">
              <CardContent className="flex items-center gap-6 p-5">
                {/* Date */}
                <div className="w-16 text-center">
                  <div className="text-3xl font-bold text-[#2d8a8a]">
                    {session.day}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.month}
                  </div>
                </div>

                {/* Session Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0f2b3c]">{session.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {session.time} • {session.location}
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  variant="outline"
                  className="rounded-lg border-gray-300 text-[#0f2b3c]"
                >
                  Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
          Vergangene Sessions
        </h2>
        <div className="space-y-3">
          {pastSessions.map((session) => (
            <Card key={session.id} className="rounded-xl border bg-white shadow-sm">
              <CardContent className="flex items-center gap-6 p-5">
                {/* Date */}
                <div className="w-16 text-center">
                  <div className="text-3xl font-bold text-gray-400">
                    {session.day}
                  </div>
                  <div className="text-sm text-gray-400">{session.month}</div>
                </div>

                {/* Session Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-600">{session.title}</h3>
                  <p className="mt-0.5 text-sm text-gray-400">
                    Abgeschlossen • Aufzeichnung verfügbar
                  </p>
                </div>

                {/* Action Button */}
                {session.hasRecording && (
                  <Button
                    variant="outline"
                    className="rounded-lg border-gray-300 text-[#0f2b3c]"
                  >
                    Aufzeichnung
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
