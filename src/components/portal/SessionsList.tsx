"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@/components/ui";
import { Session } from "@/types";
import { Calendar, MapPin, Video, FileText, X } from "lucide-react";

interface SessionsListProps {
  sessions: Session[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayMonth(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("de-DE", { day: "2-digit" }),
    month: d.toLocaleDateString("de-DE", { month: "long" }),
  };
}

function buildBookingUrl(calendlyUrl: string, sessionId: string): string {
  return `${calendlyUrl}?utm_content=${sessionId}`;
}

function StatusBadge({ status }: { status: Session["status"] }) {
  if (status === "booking_open") {
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Buchung offen
      </span>
    );
  }
  if (status === "booked") {
    return (
      <span className="inline-block rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
        Gebucht
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        Abgeschlossen
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      Abgesagt
    </span>
  );
}

function SessionModal({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-5">
          <div className="space-y-1">
            <StatusBadge status={session.status} />
            <h2 className="text-lg font-semibold text-[#0f2b3c]">
              {session.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-muted-foreground hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Termin */}
          {session.booked_start_at && (
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[#2d8a8a]" />
              <div>
                <p className="text-sm font-medium text-[#0f2b3c]">Termin</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(session.booked_start_at)}
                  {" · "}
                  {formatTime(session.booked_start_at)}
                  {session.booked_end_at && ` – ${formatTime(session.booked_end_at)}`}
                  {" Uhr"}
                </p>
              </div>
            </div>
          )}

          {/* Ort */}
          {session.location && (
            <div className="flex items-start gap-3">
              <Video className="mt-0.5 h-5 w-5 shrink-0 text-[#2d8a8a]" />
              <div>
                <p className="text-sm font-medium text-[#0f2b3c]">Ort</p>
                <p className="text-sm text-muted-foreground">{session.location}</p>
              </div>
            </div>
          )}

          {/* Beschreibung */}
          {session.description && (
            <div>
              <p className="text-sm font-medium text-[#0f2b3c]">Beschreibung</p>
              <p className="mt-1 text-sm text-muted-foreground">{session.description}</p>
            </div>
          )}

          {/* Meeting Notes (completed) */}
          {session.status === "completed" && session.recording_url && (
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#2d8a8a]" />
              <div>
                <p className="text-sm font-medium text-[#0f2b3c]">Meeting Notes</p>
                <a
                  href={session.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#2d8a8a] hover:underline"
                >
                  Meeting Notes verfügbar
                </a>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="border-t p-5">
          {session.status === "booking_open" && (
            <a
              href={buildBookingUrl(session.calendly_url, session.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#0f2b3c] text-white hover:bg-[#1a3d54]">
                Termin buchen
              </Button>
            </a>
          )}
          {session.status === "booked" && session.meeting_url && (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#2d8a8a] text-white hover:bg-[#257373]">
                Session beitreten
              </Button>
            </a>
          )}
          {session.status === "completed" && session.recording_url && (
            <a
              href={session.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#2d8a8a] text-white hover:bg-[#257373]">
                Meeting Notes ansehen
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function SessionsList({ sessions }: SessionsListProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const now = new Date();

  const bookingOpenSessions = sessions
    .filter((s) => s.status === "booking_open")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const upcomingSessions = sessions
    .filter(
      (s) =>
        s.status === "booked" &&
        s.booked_start_at &&
        new Date(s.booked_start_at) > now
    )
    .sort(
      (a, b) =>
        new Date(a.booked_start_at!).getTime() - new Date(b.booked_start_at!).getTime()
    );

  const pastSessions = sessions
    .filter(
      (s) =>
        s.status === "completed" ||
        s.status === "canceled" ||
        (s.status === "booked" && s.booked_start_at && new Date(s.booked_start_at) <= now)
    )
    .sort(
      (a, b) =>
        new Date(b.booked_start_at ?? b.created_at).getTime() -
        new Date(a.booked_start_at ?? a.created_at).getTime()
    );

  return (
    <>
      {selectedSession && (
        <SessionModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Buchung erforderlich */}
      {bookingOpenSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
            Buchung erforderlich
          </h2>
          <div className="space-y-3">
            {bookingOpenSessions.map((session) => (
              <Card key={session.id} className="rounded-xl border bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Buchung offen
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#0f2b3c]">{session.title}</h3>
                  {session.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {session.description}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <a
                      href={buildBookingUrl(session.calendly_url, session.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button className="w-full bg-[#0f2b3c] text-white hover:bg-[#1a3d54]" size="sm">
                        Termin buchen
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                    >
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Kommende Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
            Kommende Sessions
          </h2>
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const { day, month } = formatDayMonth(session.booked_start_at!);
              return (
                <Card key={session.id} className="rounded-xl border bg-white shadow-sm">
                  <CardContent className="flex items-center gap-6 p-5">
                    <div className="w-16 shrink-0 text-center">
                      <div className="text-3xl font-bold text-[#2d8a8a]">{day}</div>
                      <div className="text-sm text-muted-foreground">{month}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0f2b3c]">{session.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatTime(session.booked_start_at!)}
                        {session.booked_end_at && ` – ${formatTime(session.booked_end_at)}`}
                        {" Uhr"}
                        {session.location && ` · ${session.location}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-lg border-gray-300 text-[#0f2b3c]"
                      onClick={() => setSelectedSession(session)}
                    >
                      Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Vergangene Sessions */}
      {pastSessions.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
            Vergangene Sessions
          </h2>
          <div className="space-y-3">
            {pastSessions.map((session) => {
              const dateStr = session.booked_start_at
                ? formatDayMonth(session.booked_start_at)
                : null;
              return (
                <Card key={session.id} className="rounded-xl border bg-white shadow-sm">
                  <CardContent className="flex items-center gap-6 p-5">
                    {dateStr ? (
                      <div className="w-16 shrink-0 text-center">
                        <div className="text-3xl font-bold text-gray-400">{dateStr.day}</div>
                        <div className="text-sm text-gray-400">{dateStr.month}</div>
                      </div>
                    ) : (
                      <div className="w-16 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-600">{session.title}</h3>
                      {session.status === "completed" && session.recording_url ? (
                        <p className="mt-0.5 text-sm text-gray-400">
                          Abgeschlossen · Meeting Notes verfügbar
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm text-gray-400">
                          {session.status === "canceled" ? "Abgesagt" : "Abgeschlossen"}
                        </p>
                      )}
                    </div>
                    {session.status === "completed" && session.recording_url && (
                      <a
                        href={session.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-lg border-gray-300 text-[#0f2b3c]"
                        >
                          Meeting Notes
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {bookingOpenSessions.length === 0 &&
        upcomingSessions.length === 0 &&
        pastSessions.length === 0 && (
          <p className="text-muted-foreground">
            Aktuell keine Sessions geplant.
          </p>
        )}
    </>
  );
}
