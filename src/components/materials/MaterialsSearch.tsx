"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";
import { Search } from "lucide-react";

export function MaterialsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`/portal/materials?${params.toString()}`);
  };

  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search materials..."
        defaultValue={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-10 rounded-lg border-gray-200 pl-10"
      />
    </div>
  );
}
