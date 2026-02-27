"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";

const MATERIAL_TYPE_OPTIONS = [
  { value: 'scorecard', label: 'Scorecard' },
  { value: 'document', label: 'Dokument' },
  { value: 'product', label: 'Produkt' },
] as const;

interface MaterialUploadFormProps {
  companyId?: string | null;
  onSuccess: (material: { id: string; title: string }) => void;
  onCancel?: () => void;
  className?: string;
}

export function MaterialUploadForm({ companyId, onSuccess, onCancel, className }: MaterialUploadFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('document');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!title.trim()) { setError('Titel ist erforderlich'); return; }
    if (!file) { setError('Bitte eine Datei auswählen'); return; }

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      if (companyId) fd.append('company_id', companyId);
      fd.append('type', type);
      fd.append('is_published', 'true');

      const res = await fetch('/api/materials/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Fehler beim Hochladen');
      }
      const material = await res.json();
      onSuccess({ id: material.id, title: title.trim() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`rounded-lg border bg-gray-50 p-4 space-y-3 ${className ?? ''}`}>
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
          >
            {MATERIAL_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Titel *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dateiname / Titel…"
            className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a]"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Beschreibung</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optionale Beschreibung…"
          className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-[#2d8a8a] resize-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Datei *</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-[#e6f4f4] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#2d8a8a] hover:file:bg-[#d0ecec]"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Abbrechen
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-md bg-[#2d8a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#267878] disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Hochladen…' : 'Hochladen'}
        </button>
      </div>
    </div>
  );
}
