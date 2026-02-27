import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/task-tags — authenticated users
// ?include_archived=true to include archived tags (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeArchived = request.nextUrl.searchParams.get("include_archived") === "true";

  if (auth.profile.role === "admin") {
    let query = createAdminClient()
      .from("task_tags")
      .select("*")
      .order("name");
    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_tags")
    .select("*")
    .eq("is_archived", false)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/task-tags — admin only
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("task_tags")
    .insert({ name, color: color ?? "#2d8a8a" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
