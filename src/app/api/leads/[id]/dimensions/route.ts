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
  const { current_dimension_scores } = body;

  if (!Array.isArray(current_dimension_scores)) {
    return NextResponse.json({ error: "current_dimension_scores must be an array" }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("leads")
    .update({ current_dimension_scores })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
