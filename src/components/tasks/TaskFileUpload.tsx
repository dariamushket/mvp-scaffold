"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { TaskAttachment } from "@/types";

interface TaskFileUploadProps {
  taskId: string;
  onUploaded: (attachment: TaskAttachment) => void;
}

export function TaskFileUpload({ taskId, onUploaded }: TaskFileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Upload fehlgeschlagen");
      }
      onUploaded(data as TaskAttachment);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="flex-1 rounded-lg border px-3 py-1.5 text-xs text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2d8a8a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#267878] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Hochladen
        </button>
      </div>
      <p className="text-[10px] text-gray-400">PDF oder Word, max. 20 MB</p>
    </form>
  );
}
