import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteMaterialRecord, getMaterialById } from "@/lib/materials";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const material = await getMaterialById(id);
  if (!material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Delete file from storage first
  const adminClient = createAdminClient();
  await adminClient.storage.from("materials").remove([material.storage_path]);

  // Delete metadata row
  const success = await deleteMaterialRecord(id);
  if (!success) {
    return NextResponse.json({ error: "Failed to delete material record" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  let body: { is_published?: unknown; tag_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.is_published === "boolean") {
    updates.is_published = body.is_published;
  }
  if ("tag_id" in body) {
    updates.tag_id = body.tag_id ?? null;
  }

  if (Object.keys(updates).length === 1) {
    // only updated_at set — nothing actually changed
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("materials")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
