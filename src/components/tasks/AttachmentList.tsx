"use client";

import { Link2, FileText } from "lucide-react";
import { TaskAttachment } from "@/types";

interface AttachmentListProps {
  attachments: TaskAttachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) {
    return <p className="text-sm text-gray-400">Keine Anhänge</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <a
          key={att.id}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {att.type === "material" ? (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100">
                <FileText className="h-3 w-3 text-purple-600" />
              </span>
              <span className="font-medium text-purple-700">Material:</span>
              <span className="text-gray-700">{att.label}</span>
            </>
          ) : att.label.toLowerCase().endsWith(".pdf") ? (
            <>
              <FileText className="h-4 w-4 text-red-500" />
              <span className="text-gray-700">{att.label}</span>
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 text-[#2d8a8a]" />
              <span className="text-gray-700">{att.label}</span>
            </>
          )}
        </a>
      ))}
    </div>
  );
}
