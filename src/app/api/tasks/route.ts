import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/tasks
// Admin: ?company_id=<id> — fetches tasks for a specific company
// Customer: fetches tasks for own company (RLS-scoped)
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");

  if (auth.profile.role === "admin") {
    if (!companyId) {
      return NextResponse.json({ error: "company_id is required for admin" }, { status: 400 });
    }
    const { data, error } = await createAdminClient()
      .from("tasks")
      .select("*, tag:task_tags(*), subtasks(*), attachments:task_attachments(*)")
      .eq("company_id", companyId)
      .order("status")
      .order("position");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Customer: RLS enforces company scoping
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, tag:task_tags(*), subtasks(*), attachments:task_attachments(*)")
    .order("status")
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tasks — admin only
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { company_id, title, description, status, tag_id, deadline, position } = body;

  if (!company_id || !title) {
    return NextResponse.json({ error: "company_id and title are required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("tasks")
    .insert({
      company_id,
      title,
      description: description ?? null,
      status: status ?? "not_started",
      tag_id: tag_id ?? null,
      deadline: deadline ?? null,
      position: position ?? 0,
      created_by: auth.user.id,
    })
    .select("*, tag:task_tags(*), subtasks(*), attachments:task_attachments(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
