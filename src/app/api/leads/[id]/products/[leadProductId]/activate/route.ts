import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductTemplatePayload, TaskTemplateTaskDef } from "@/types";

// POST /api/leads/[id]/products/[leadProductId]/activate — admin only
// Creates tasks, sessions, and material placeholders for the lead, then sets status to 'activated'
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; leadProductId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: leadId, leadProductId } = await params;
  const adminClient = createAdminClient();

  // Fetch the lead_product with its template
  const { data: leadProduct, error: lpError } = await adminClient
    .from("lead_products")
    .select("*, product_template:product_templates(*)")
    .eq("id", leadProductId)
    .eq("lead_id", leadId)
    .single();

  if (lpError || !leadProduct) {
    return NextResponse.json({ error: "Lead product not found" }, { status: 404 });
  }

  if (leadProduct.status === "activated") {
    return NextResponse.json({ error: "Already activated" }, { status: 400 });
  }

  const template = leadProduct.product_template as {
    id: string;
    tag_id: string | null;
    payload: ProductTemplatePayload;
  };

  if (!template) {
    return NextResponse.json({ error: "Product template not found" }, { status: 404 });
  }

  const payload: ProductTemplatePayload = template.payload ?? { tasks: [], sessions: [], materials: [] };
  const today = new Date();

  // 1. Create tasks
  const taskDefs: TaskTemplateTaskDef[] = Array.isArray(payload.tasks) ? payload.tasks : [];
  for (let i = 0; i < taskDefs.length; i++) {
    const def = taskDefs[i];

    let deadline: string | null = null;
    if (def.deadline_offset_days != null) {
      const d = new Date(today);
      d.setDate(d.getDate() + def.deadline_offset_days);
      deadline = d.toISOString().split("T")[0];
    }

    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .insert({
        company_id: leadId,
        title: def.title,
        description: def.description ?? null,
        status: def.status ?? "not_started",
        tag_id: def.tag_id ?? template.tag_id ?? null,
        deadline,
        position: i,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: taskError?.message ?? "Failed to create task" }, { status: 500 });
    }

    // Create subtasks
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

    // Create task attachments
    if (def.attachments && def.attachments.length > 0) {
      const { error: taError } = await adminClient.from("task_attachments").insert(
        def.attachments.map((a) => ({
          task_id: task.id,
          label: a.label,
          url: a.url,
          type: a.type ?? "link",
        }))
      );
      if (taError) {
        return NextResponse.json({ error: taError.message }, { status: 500 });
      }
    }
  }

  // 2. Create sessions
  const sessionDefs = Array.isArray(payload.sessions) ? payload.sessions : [];
  for (const sessionDef of sessionDefs) {
    const { error: sessionError } = await adminClient.from("sessions").insert({
      lead_id: leadId,
      title: sessionDef.title,
      description: sessionDef.description ?? null,
      calendly_url: sessionDef.calendly_url ?? "",
      status: "booking_open",
      show_on_dashboard: sessionDef.show_on_dashboard ?? false,
      created_by_admin_id: auth.user.id,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }
  }

  // 3. Create material placeholders
  const materialDefs = Array.isArray(payload.materials) ? payload.materials : [];
  for (const matDef of materialDefs) {
    const { error: matError } = await adminClient.from("materials").insert({
      title: matDef.title,
      description: matDef.description ?? null,
      company_id: leadId,
      uploaded_by: auth.user.id,
      is_published: false,
      is_placeholder: true,
      type: matDef.type ?? "product",
      tag_id: template.tag_id ?? null,
      file_name: "",
      storage_path: "",
      mime_type: "application/octet-stream",
      size_bytes: 0,
    });

    if (matError) {
      return NextResponse.json({ error: matError.message }, { status: 500 });
    }
  }

  // 4. Update lead_product status to activated
  const { data: updated, error: updateError } = await adminClient
    .from("lead_products")
    .update({ status: "activated", activated_at: new Date().toISOString() })
    .eq("id", leadProductId)
    .select("*, product_template:product_templates(*, tag:task_tags(*))")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
