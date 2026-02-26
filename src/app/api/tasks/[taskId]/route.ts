import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/tasks/[taskId]
// Admin: can update all fields
// Customer: can only update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const body = await request.json();

  const adminFields = ["title", "description", "status", "tag_id", "deadline", "position"];
  const customerFields = ["status"];

  const allowedFields = auth.profile.role === "admin" ? adminFields : customerFields;
  const updates: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  // Reject if customer tries to update non-whitelisted fields
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
      .from("tasks")
      .update(updates)
      .eq("id", taskId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Customer: use server client (RLS validates company ownership)
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/tasks/[taskId] — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;

  const { error } = await createAdminClient()
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
