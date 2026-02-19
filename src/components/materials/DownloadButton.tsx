"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Download, Loader2 } from "lucide-react";

interface DownloadButtonProps {
  materialId: string;
}

export function DownloadButton({ materialId }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/download`);
      if (!response.ok) return;
      const { signedUrl } = await response.json();
      window.open(signedUrl, "_blank");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="mt-4 w-full rounded-lg border-gray-300 text-[#0f2b3c]"
      onClick={handleDownload}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download
        </>
      )}
    </Button>
  );
}
