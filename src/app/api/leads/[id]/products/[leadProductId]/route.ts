import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE /api/leads/[id]/products/[leadProductId] — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; leadProductId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { leadProductId } = await params;

  const { error } = await createAdminClient()
    .from("lead_products")
    .delete()
    .eq("id", leadProductId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
