import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { title, description, calendly_url, show_on_dashboard } = await req.json();

  if (!title || !calendly_url) {
    return NextResponse.json({ error: "title and calendly_url are required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("sessions")
    .insert({
      lead_id: id,
      created_by_admin_id: auth.user.id,
      title,
      description: description ?? null,
      calendly_url,
      show_on_dashboard: show_on_dashboard ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
