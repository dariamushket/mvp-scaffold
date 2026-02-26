"use client";

import { useState, useRef } from "react";
import { Button, Input, Label } from "@/components/ui";
import { Paperclip } from "lucide-react";
import { Session } from "@/types";

interface SessionEditorModalProps {
  leadId: string;
  companyId: string;
  session?: Session;
  onSaved: () => void;
  onDeleted?: () => void;
  onClose: () => void;
}

export function SessionEditorModal({
  leadId,
  companyId,
  session,
  onSaved,
  onDeleted,
  onClose,
}: SessionEditorModalProps) {
  const isEdit = Boolean(session);

  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [calendlyUrl, setCalendlyUrl] = useState(session?.calendly_url ?? "");
  const [showOnDashboard, setShowOnDashboard] = useState(session?.show_on_dashboard ?? true);
  const [status, setStatus] = useState<"booking_open" | "completed" | "canceled">(
    (session?.status === "booked" ? "booking_open" : session?.status) as "booking_open" | "completed" | "canceled" ?? "booking_open"
  );
  const [location, setLocation] = useState(session?.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(session?.meeting_url ?? "");
  const [recordingUrl, setRecordingUrl] = useState(session?.recording_url ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Meeting notes upload state
  const [uploadingNotes, setUploadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasMeetingNotes =
    isEdit &&
    session?.recording_url?.startsWith("/api/materials/");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit && session) {
        const body: Record<string, unknown> = {
          title,
          description: description || null,
          calendly_url: calendlyUrl,
          show_on_dashboard: showOnDashboard,
          status,
          location: location || null,
          meeting_url: meetingUrl || null,
          recording_url: recordingUrl || null,
        };

        const res = await fetch(`/api/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Fehler beim Speichern der Session");
        }
      } else {
        const res = await fetch(`/api/leads/${leadId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            calendly_url: calendlyUrl,
            show_on_dashboard: showOnDashboard,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Fehler beim Erstellen der Session");
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Fehler beim Löschen der Session");
      }

      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function handleNotesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    setUploadingNotes(true);
    setNotesError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", session.title);
      formData.append("description", "Meeting notes for a conducted session");
      formData.append("company_id", companyId);
      formData.append("type", "meeting_notes");
      formData.append("is_published", "true");

      const uploadRes = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const json = await uploadRes.json();
        throw new Error(json.error ?? "Upload fehlgeschlagen");
      }

      const { id: materialId } = await uploadRes.json();
      const newRecordingUrl = `/api/materials/${materialId}/download?redirect=true`;

      const patchRes = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_url: newRecordingUrl }),
      });

      if (!patchRes.ok) {
        const json = await patchRes.json();
        throw new Error(json.error ?? "Fehler beim Verknüpfen der Notizen");
      }

      setRecordingUrl(newRecordingUrl);
      onSaved();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setUploadingNotes(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const showMeetingNotesSection = isEdit && status === "completed";
  const currentHasMeetingNotes = recordingUrl.startsWith("/api/materials/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#0f2b3c]">
            {isEdit ? "Session bearbeiten" : "Session planen"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="se-title">
                Titel <span className="text-red-500">*</span>
              </Label>
              <Input
                id="se-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Strategiegespräch"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="se-description">Beschreibung</Label>
              <textarea
                id="se-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung der Session"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="se-calendly">
                Buchungslink <span className="text-red-500">*</span>
              </Label>
              <Input
                id="se-calendly"
                type="url"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/..."
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="se-dashboard"
                type="checkbox"
                checked={showOnDashboard}
                onChange={(e) => setShowOnDashboard(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2d8a8a]"
              />
              <Label htmlFor="se-dashboard" className="cursor-pointer">
                Auf Nutzer-Dashboard anzeigen
              </Label>
            </div>

            {isEdit && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="se-status">Status</Label>
                  <select
                    id="se-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="booking_open">Buchung offen</option>
                    <option value="completed">Abgeschlossen</option>
                    <option value="canceled">Abgesagt</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="se-location">Ort</Label>
                  <Input
                    id="se-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="z.B. Zoom, Berlin Office"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="se-meeting-url">Meeting-Link</Label>
                  <Input
                    id="se-meeting-url"
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://zoom.us/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="se-recording-url">Aufzeichnung URL</Label>
                  <Input
                    id="se-recording-url"
                    value={recordingUrl}
                    onChange={(e) => setRecordingUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {/* Meeting Notes section (edit mode + status completed) */}
            {showMeetingNotesSection && (
              <div className="rounded-lg border border-dashed p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0f2b3c]">
                  <Paperclip className="h-4 w-4" />
                  Meeting Notes
                </div>

                {currentHasMeetingNotes ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-700">Notizen angehängt ✓</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingNotes}
                      className="text-xs text-[#2d8a8a] hover:underline disabled:opacity-50"
                    >
                      {uploadingNotes ? "Wird hochgeladen…" : "Ersetzen"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      PDF oder Word-Dokument hochladen
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingNotes}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Paperclip className="h-4 w-4" />
                      {uploadingNotes ? "Wird hochgeladen…" : "Datei auswählen"}
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleNotesUpload}
                />

                {notesError && (
                  <p className="text-xs text-red-600">{notesError}</p>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 pt-2">
              {isEdit && !deleteConfirm && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-sm text-red-600 hover:underline mr-auto"
                >
                  Session löschen
                </button>
              )}

              {isEdit && deleteConfirm && (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm text-red-700 font-medium">Wirklich löschen?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "…" : "Ja, löschen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className={isEdit && !deleteConfirm ? "" : "ml-auto"}
                onClick={onClose}
                disabled={loading || deleting}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
                disabled={loading || deleting}
              >
                {loading ? "Wird gespeichert…" : isEdit ? "Speichern" : "Session erstellen"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
