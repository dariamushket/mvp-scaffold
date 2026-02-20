import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireRole";
import { getProfile } from "@/lib/auth/getProfile";
import { createClient } from "@/lib/supabase/server";
import { Session } from "@/types";
import { SessionsList } from "@/components/portal/SessionsList";
import { Button } from "@/components/ui";

export default async function PortalSessionsPage() {
  await requireAuth();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  let sessions: Session[] = [];
  let firstBookingOpen: Session | null = null;

  if (profile.company_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("lead_id", profile.company_id)
      .order("created_at", { ascending: false });

    sessions = (data ?? []) as Session[];
    firstBookingOpen = sessions.find((s) => s.status === "booking_open") ?? null;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f2b3c]">Sessions</h1>
          <p className="mt-1 text-muted-foreground">
            Ihre geplanten Beratungsgespräche
          </p>
        </div>
        {firstBookingOpen && (
          <Button
            asChild
            className="bg-[#2d8a8a] text-white hover:bg-[#257373]"
          >
            <a
              href={`${firstBookingOpen.calendly_url}?utm_content=${firstBookingOpen.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Session buchen
            </a>
          </Button>
        )}
      </div>

      <SessionsList sessions={sessions} />
    </div>
  );
}
