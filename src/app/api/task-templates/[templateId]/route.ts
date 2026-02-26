import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/task-templates/[templateId] — admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;
  const body = await request.json();
  const allowed = ["name", "description", "tag_id", "payload"];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("task_templates")
    .update(updates)
    .eq("id", templateId)
    .select("*, tag:task_tags(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/task-templates/[templateId] — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;

  const { error } = await createAdminClient()
    .from("task_templates")
    .delete()
    .eq("id", templateId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
