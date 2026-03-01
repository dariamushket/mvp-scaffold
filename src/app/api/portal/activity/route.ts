import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile } = auth;
  const companyId = profile.company_id;
  if (!companyId) return NextResponse.json({ tasksLatestAt: null, materialsLatestAt: null });

  const adminClient = createAdminClient();

  // Get all task IDs for this company
  const { data: allTaskRows } = await adminClient
    .from("tasks")
    .select("id, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const allTaskIds = (allTaskRows ?? []).map((t: { id: string }) => t.id);
  const latestTaskCreatedAt = (allTaskRows ?? [])[0]?.created_at ?? null;

  // Latest admin comment on company tasks
  // author_id → auth.users FK (not profiles), so query profiles separately
  let latestAdminCommentAt: string | null = null;
  if (allTaskIds.length > 0) {
    const { data: commentRows } = await adminClient
      .from("task_comments")
      .select("created_at, author_id")
      .in("task_id", allTaskIds)
      .order("created_at", { ascending: false })
      .limit(50);

    const authorIds = Array.from(new Set((commentRows ?? []).map((c: { author_id: string }) => c.author_id))) as string[];
    const roleMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profileRows } = await adminClient.from("profiles").select("id, role").in("id", authorIds);
      (profileRows ?? []).forEach((p: { id: string; role: string }) => { roleMap[p.id] = p.role; });
    }

    const adminComment = (commentRows ?? []).find(
      (c: { author_id: string }) => roleMap[c.author_id] === "admin"
    ) as { created_at: string } | undefined;
    latestAdminCommentAt = adminComment?.created_at ?? null;
  }

  // Latest between: newest task created, newest admin comment
  const tasksLatestAt =
    [latestTaskCreatedAt, latestAdminCommentAt].filter(Boolean).sort().pop() ?? null;

  // Latest admin-uploaded published material for this company
  // uploaded_by → auth.users FK (not profiles), so query profiles separately
  const { data: materialRows } = await adminClient
    .from("materials")
    .select("created_at, uploaded_by")
    .eq("company_id", companyId)
    .eq("is_published", true)
    .eq("is_placeholder", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const uploaderIds = Array.from(new Set((materialRows ?? []).map((m: { uploaded_by: string }) => m.uploaded_by))) as string[];
  const uploaderRoleMap: Record<string, string> = {};
  if (uploaderIds.length > 0) {
    const { data: profileRows } = await adminClient.from("profiles").select("id, role").in("id", uploaderIds);
    (profileRows ?? []).forEach((p: { id: string; role: string }) => { uploaderRoleMap[p.id] = p.role; });
  }

  const latestAdminMat = (materialRows ?? []).find(
    (m: { uploaded_by: string }) => uploaderRoleMap[m.uploaded_by] === "admin"
  ) as { created_at: string } | undefined;
  const materialsLatestAt: string | null = latestAdminMat?.created_at ?? null;

  return NextResponse.json({ tasksLatestAt, materialsLatestAt });
}
