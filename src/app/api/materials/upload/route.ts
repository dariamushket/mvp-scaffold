import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMaterialRecord } from "@/lib/materials";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const companyId = formData.get("company_id") as string | null;
  const type = (formData.get("type") as string | null) ?? "document";
  const isPublishedRaw = formData.get("is_published") as string | null;
  const isPublished = isPublishedRaw === "true";
  const tagId = (formData.get("tag_id") as string | null) || null;

  if (!file || !title || !companyId) {
    return NextResponse.json({ error: "Missing required fields: file, title, company_id" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Only PDF and Word documents are accepted." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File size exceeds 50 MB limit" }, { status: 400 });
  }

  const materialId = crypto.randomUUID();
  const storagePath = `${companyId}/${materialId}/${file.name}`;

  const adminClient = createAdminClient();
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

  const material = await createMaterialRecord({
    title,
    description: description || null,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    storage_path: storagePath,
    company_id: companyId,
    uploaded_by: auth.user.id,
    type,
    is_published: isPublished,
    tag_id: tagId,
  });

  if (!material) {
    // Clean up the uploaded file if DB insert failed
    await adminClient.storage.from("materials").remove([storagePath]);
    return NextResponse.json({ error: "Failed to save material record" }, { status: 500 });
  }

  return NextResponse.json({ id: material.id, title: material.title });
}
