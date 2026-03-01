import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  // Validate task ownership: task.company_id must match profile.company_id
  const adminClient = createAdminClient();
  const { data: task } = await adminClient
    .from("tasks")
    .select("id, company_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Admins can access any task; customers can only access tasks for their company
  if (auth.profile.role === "customer" && task.company_id !== auth.profile.company_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Only PDF and Word documents are accepted." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File size exceeds 20 MB limit" }, { status: 400 });
  }

  const companyId = task.company_id;
  const materialId = crypto.randomUUID();
  const storagePath = `${companyId}/${materialId}/${file.name}`;

  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await adminClient.storage
    .from("materials")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
  }

  // Create material record
  const { data: material, error: materialError } = await adminClient
    .from("materials")
    .insert({
      title: file.name,
      description: null,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
      company_id: companyId,
      uploaded_by: auth.user.id,
      type: "document",
      is_published: false,
      is_placeholder: false,
    })
    .select("id, title")
    .single();

  if (materialError || !material) {
    await adminClient.storage.from("materials").remove([storagePath]);
    return NextResponse.json({ error: "Failed to save material record" }, { status: 500 });
  }

  // Create task_attachments row
  const { data: attachment, error: attError } = await adminClient
    .from("task_attachments")
    .insert({
      task_id: taskId,
      label: file.name,
      url: `/api/materials/${material.id}/download`,
      type: "material",
      material_id: material.id,
    })
    .select("*")
    .single();

  if (attError || !attachment) {
    return NextResponse.json({ error: "Failed to create attachment record" }, { status: 500 });
  }

  return NextResponse.json(attachment, { status: 201 });
}
