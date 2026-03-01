import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Use admin client to bypass RLS, then apply explicit authorization
  const adminClient = createAdminClient();
  const { data: material } = await adminClient
    .from("materials")
    .select("*")
    .eq("id", id)
    .single();

  if (!material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Non-admins may only access materials belonging to their own company or shared materials
  if (auth.profile.role !== "admin") {
    const allowed =
      material.company_id === auth.profile.company_id ||
      material.company_id === null;
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Generate a time-limited signed URL (1 hour)
  const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
    .from("materials")
    .createSignedUrl(material.storage_path, 3600);

  if (signedUrlError || !signedUrlData) {
    console.error("Signed URL error:", signedUrlError);
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  const redirect = request.nextUrl.searchParams.get("redirect");
  if (redirect === "true") {
    return NextResponse.redirect(signedUrlData.signedUrl);
  }

  return NextResponse.json({ signedUrl: signedUrlData.signedUrl });
}
