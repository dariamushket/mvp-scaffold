"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui";

interface DeleteTaskModalProps {
  taskTitle: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteTaskModal({ taskTitle, onConfirm, onClose }: DeleteTaskModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-[#0f2b3c]">Aufgabe löschen?</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 text-sm text-gray-600">
          Sind Sie sicher, dass Sie die Aufgabe{" "}
          <span className="font-medium text-[#0f2b3c]">&bdquo;{taskTitle}&ldquo;</span> löschen möchten?
        </p>
        <p className="mb-6 text-sm text-gray-500">
          Diese Aktion kann nicht rückgängig gemacht werden. Alle Teilaufgaben, Anhänge und Kommentare
          werden dauerhaft gelöscht.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Löschen…" : "Endgültig löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}
