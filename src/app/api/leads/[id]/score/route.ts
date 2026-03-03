import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { current_score } = body;

  if (typeof current_score !== "number" || current_score < 0 || current_score > 100) {
    return NextResponse.json({ error: "current_score must be a number between 0 and 100" }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("leads")
    .update({ current_score })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
