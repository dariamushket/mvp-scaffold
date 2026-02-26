import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/tasks/[taskId]/subtasks/[subtaskId]
// Admin: title, is_done, deadline, position
// Customer: is_done only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtaskId } = await params;
  const body = await request.json();

  const adminFields = ["title", "is_done", "deadline", "position"];
  const customerFields = ["is_done"];

  const allowedFields = auth.profile.role === "admin" ? adminFields : customerFields;
  const updates: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (auth.profile.role === "customer") {
    const requestedKeys = Object.keys(body);
    const forbidden = requestedKeys.filter((k) => !customerFields.includes(k));
    if (forbidden.length > 0) {
      return NextResponse.json(
        { error: `Customers may only update: ${customerFields.join(", ")}` },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (auth.profile.role === "admin") {
    const { error } = await createAdminClient()
      .from("subtasks")
      .update(updates)
      .eq("id", subtaskId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("subtasks")
      .update(updates)
      .eq("id", subtaskId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/tasks/[taskId]/subtasks/[subtaskId] — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subtaskId } = await params;

  const { error } = await createAdminClient()
    .from("subtasks")
    .delete()
    .eq("id", subtaskId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
