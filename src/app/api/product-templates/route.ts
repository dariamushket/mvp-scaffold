import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/product-templates — admin only
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await createAdminClient()
    .from("product_templates")
    .select("*, tag:task_tags(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/product-templates — admin only
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, tag_id, status, payload } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("product_templates")
    .insert({
      name,
      description: description ?? null,
      tag_id: tag_id ?? null,
      status: status ?? "draft",
      payload: payload ?? { tasks: [], sessions: [], materials: [] },
      created_by: auth.user.id,
    })
    .select("*, tag:task_tags(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
