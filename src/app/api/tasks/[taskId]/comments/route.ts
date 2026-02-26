import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/tasks/[taskId]/comments — authenticated users
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  if (auth.profile.role === "admin") {
    const { data, error } = await createAdminClient()
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tasks/[taskId]/comments — authenticated users
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const body = await request.json();
  const { body: commentBody } = body;

  if (!commentBody?.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  // Use admin client to allow both roles to insert (RLS allows customers via policy)
  const { data, error } = await createAdminClient()
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_id: auth.user.id,
      body: commentBody.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
