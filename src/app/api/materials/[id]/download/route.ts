import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMaterialById } from "@/lib/materials";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch material — RLS enforces that customers only see their company's published materials
  const material = await getMaterialById(id);
  if (!material) {
    return NextResponse.json({ error: "Material not found or access denied" }, { status: 403 });
  }

  // Generate a time-limited signed URL (1 hour)
  const adminClient = createAdminClient();
  const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
    .from("materials")
    .createSignedUrl(material.storage_path, 3600);

  if (signedUrlError || !signedUrlData) {
    console.error("Signed URL error:", signedUrlError);
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signedUrlData.signedUrl });
}
