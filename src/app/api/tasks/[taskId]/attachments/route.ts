import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/tasks/[taskId]/attachments — admin only
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;
  const body = await request.json();
  const { label, url, type, material_id } = body;

  if (!label || !url) {
    return NextResponse.json({ error: "label and url are required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("task_attachments")
    .insert({
      task_id: taskId,
      label,
      url,
      type: type ?? "link",
      material_id: material_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
