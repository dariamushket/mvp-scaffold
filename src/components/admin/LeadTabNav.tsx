"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TabId = "overview" | "tasks" | "materials" | "products";

interface LeadTabNavProps {
  leadId: string;
  activeTab: TabId;
  tabs: { id: TabId; label: string }[];
  tabLatestAt: Partial<Record<TabId, string | null>>;
}

export function LeadTabNav({ leadId, activeTab, tabs, tabLatestAt }: LeadTabNavProps) {
  const [seenAt, setSeenAt] = useState<Partial<Record<TabId, number>>>({});

  // Load per-tab seen timestamps from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`lead_tab_seen_${leadId}`) ?? "{}");
      setSeenAt(stored);
    } catch {
      // ignore
    }
  }, [leadId]);

  // Mark current tab as seen whenever it changes
  useEffect(() => {
    const now = Date.now();
    setSeenAt((prev) => {
      const next = { ...prev, [activeTab]: now };
      try {
        localStorage.setItem(`lead_tab_seen_${leadId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [activeTab, leadId]);

  function hasBadge(tabId: TabId): boolean {
    const latestAt = tabLatestAt[tabId];
    if (!latestAt) return false;
    const lastSeen = seenAt[tabId] ?? 0;
    return new Date(latestAt).getTime() > lastSeen;
  }

  return (
    <div className="mb-6 border-b">
      <nav className="flex gap-6">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/leads/${leadId}?tab=${t.id}`}
            className={`relative pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? "border-[#2d8a8a] text-[#2d8a8a]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {hasBadge(t.id) && (
              <span className="absolute -top-0.5 -right-2.5 h-2 w-2 rounded-full bg-amber-400" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
