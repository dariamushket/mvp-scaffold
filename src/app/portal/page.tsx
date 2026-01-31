"use client";

import { Button, Card, CardContent } from "@/components/ui";
import { Calendar } from "lucide-react";

const BOOKING_URL = "https://calendly.com/psei/executive-diagnose";

// Mock data - will be replaced with real data later
const MOCK_DATA = {
  userName: "Max",
  score: 68,
  scoreStatus: "Belastbar",
  openTasks: 4,
  totalTasks: 12,
  nextSession: {
    date: "12. Feb 2025",
    time: "14:00 - 15:00 Uhr",
  },
  dimensions: [
    { name: "Strategische Ausrichtung", score: 72, status: "Done" },
    { name: "Führungskompetenz", score: 58, status: "Belastbar" },
    { name: "Talententwicklung", score: 45, status: "Instabil" },
    { name: "Kulturelle Stärke", score: 81, status: "Done" },
  ],
};

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    Done: "bg-green-100 text-green-700",
    Belastbar: "bg-yellow-100 text-yellow-700",
    Instabil: "bg-orange-100 text-orange-700",
  };
  return styles[status] || "bg-gray-100 text-gray-700";
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-[#2d8a8a]";
  if (score >= 50) return "text-yellow-600";
  return "text-orange-500";
}

export default function PortalDashboardPage() {
  const taskProgress = (MOCK_DATA.openTasks / MOCK_DATA.totalTasks) * 100;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">
            Guten Tag, {MOCK_DATA.userName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Ihr People Strategy & Execution Index Überblick
          </p>
        </div>
        <Button
          asChild
          className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
        >
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            Strategiegespräch buchen
          </a>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {/* PSEI Score Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#2d8a8a]">Ihr PSEI Score</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-[#0f2b3c]">
                {MOCK_DATA.score}
              </span>
              <span className="text-xl text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-3">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(MOCK_DATA.scoreStatus)}`}
              >
                {MOCK_DATA.scoreStatus}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Open Tasks Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#0f2b3c]">Offene Aufgaben</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-[#0f2b3c]">
                {MOCK_DATA.openTasks}
              </span>
              <span className="text-xl text-muted-foreground">
                / {MOCK_DATA.totalTasks}
              </span>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#2d8a8a]"
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Session Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#2d8a8a]">Nächste Session</p>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0f2b3c]" />
              <span className="text-2xl font-bold text-[#0f2b3c]">
                {MOCK_DATA.nextSession.date}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {MOCK_DATA.nextSession.time}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dimensions Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-[#0f2b3c]">
          Ihre Dimensionen im Überblick
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MOCK_DATA.dimensions.map((dimension) => (
            <Card key={dimension.name} className="rounded-xl border shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-[#0f2b3c]">
                  {dimension.name}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-2xl font-bold ${getScoreColor(dimension.score)}`}
                  >
                    {dimension.score}%
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(dimension.status)}`}
                  >
                    {dimension.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Next Action CTA */}
      <Card className="mt-8 rounded-xl border-[#2d8a8a] bg-[#f0f7f7]">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-[#0f2b3c]">Nächster Schritt</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Buchen Sie ein Strategiegespräch, um Ihre Ergebnisse zu besprechen
              und einen Aktionsplan zu erstellen.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 bg-[#2d8a8a] text-white hover:bg-[#257373]"
          >
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
              Termin buchen
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
