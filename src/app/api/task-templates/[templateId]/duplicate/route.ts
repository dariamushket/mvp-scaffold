import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/task-templates/[templateId]/duplicate — admin only
// Clones the template with " (Kopie)" suffix on the name
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;
  const adminClient = createAdminClient();

  const { data: original, error: fetchError } = await adminClient
    .from("task_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: copy, error: insertError } = await adminClient
    .from("task_templates")
    .insert({
      name: `${original.name} (Kopie)`,
      description: original.description,
      tag_id: original.tag_id,
      payload: original.payload,
      created_by: auth.user.id,
    })
    .select("*, tag:task_tags(*)")
    .single();

  if (insertError || !copy) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to duplicate" }, { status: 500 });
  }

  return NextResponse.json(copy, { status: 201 });
}
