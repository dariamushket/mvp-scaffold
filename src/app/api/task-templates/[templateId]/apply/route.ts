import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskTemplateTaskDef } from "@/types";

// POST /api/task-templates/[templateId]/apply — admin only
// Body: { company_id: string }
// Instantiates all task defs from template.payload into tasks for the company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;
  const body = await request.json();
  const { company_id } = body;

  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Fetch template
  const { data: template, error: templateError } = await adminClient
    .from("task_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const payload: TaskTemplateTaskDef[] = Array.isArray(template.payload) ? template.payload : [];

  if (payload.length === 0) {
    return NextResponse.json({ error: "Template has no task definitions" }, { status: 400 });
  }

  const today = new Date();
  const createdTasks = [];

  for (let i = 0; i < payload.length; i++) {
    const def = payload[i];

    let deadline: string | null = null;
    if (def.deadline_offset_days != null) {
      const d = new Date(today);
      d.setDate(d.getDate() + def.deadline_offset_days);
      deadline = d.toISOString().split("T")[0];
    }

    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .insert({
        company_id,
        title: def.title,
        description: def.description ?? null,
        status: def.status ?? "not_started",
        tag_id: def.tag_id ?? null,
        deadline,
        position: i,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: taskError?.message ?? "Failed to create task" }, { status: 500 });
    }

    // Create subtasks one-by-one to support per-subtask attachments
    if (def.subtasks && def.subtasks.length > 0) {
      for (let j = 0; j < def.subtasks.length; j++) {
        const s = def.subtasks[j];
        let subtaskDeadline: string | null = null;
        if (s.deadline_offset_days != null) {
          const d = new Date(today);
          d.setDate(d.getDate() + s.deadline_offset_days);
          subtaskDeadline = d.toISOString().split("T")[0];
        }

        const { data: subtask, error: subtaskError } = await adminClient
          .from("subtasks")
          .insert({ task_id: task.id, title: s.title, deadline: subtaskDeadline, position: j })
          .select()
          .single();

        if (subtaskError || !subtask) {
          return NextResponse.json({ error: subtaskError?.message ?? "Failed to create subtask" }, { status: 500 });
        }

        if (s.attachments && s.attachments.length > 0) {
          const { error: saError } = await adminClient.from("subtask_attachments").insert(
            s.attachments.map((a) => ({
              subtask_id: subtask.id,
              label: a.label,
              url: a.url,
              type: a.type ?? "link",
            }))
          );
          if (saError) {
            return NextResponse.json({ error: saError.message }, { status: 500 });
          }
        }
      }
    }

    // Create attachments
    if (def.attachments && def.attachments.length > 0) {
      const attachmentRows = def.attachments.map((a) => ({
        task_id: task.id,
        label: a.label,
        url: a.url,
        type: a.type ?? "link",
      }));

      const { error: attError } = await adminClient.from("task_attachments").insert(attachmentRows);
      if (attError) {
        return NextResponse.json({ error: attError.message }, { status: 500 });
      }
    }

    createdTasks.push(task);
  }

  // Update last_used_at
  await adminClient
    .from("task_templates")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", templateId);

  return NextResponse.json({ created: createdTasks.length, tasks: createdTasks }, { status: 201 });
}
