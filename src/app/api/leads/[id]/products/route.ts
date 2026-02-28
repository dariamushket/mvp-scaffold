import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/leads/[id]/products — admin only
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { data, error } = await createAdminClient()
    .from("lead_products")
    .select("*, product_template:product_templates(*, tag:task_tags(*))")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/leads/[id]/products — admin only
// Body: { product_template_id: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { product_template_id } = await request.json();

  if (!product_template_id) {
    return NextResponse.json({ error: "product_template_id is required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("lead_products")
    .insert({
      lead_id: id,
      product_template_id,
      status: "announced",
      announced_at: new Date().toISOString(),
      created_by: auth.user.id,
    })
    .select("*, product_template:product_templates(*, tag:task_tags(*))")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
