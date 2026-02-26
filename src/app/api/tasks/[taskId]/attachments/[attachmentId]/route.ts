import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE /api/tasks/[taskId]/attachments/[attachmentId] — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string; attachmentId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { attachmentId } = await params;

  const { error } = await createAdminClient()
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
