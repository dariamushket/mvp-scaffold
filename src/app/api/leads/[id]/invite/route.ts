import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Fetch the lead to get their email and company_id
  const adminClient = createAdminClient();
  const { data: lead, error: fetchError } = await adminClient
    .from("leads")
    .select("email, id")
    .eq("id", id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Generate an invite link — the handle_new_user trigger will create
  // a profile with role='customer' and company_id=lead.id when the user
  // clicks the link and their auth account is created.
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email: lead.email,
    options: {
      data: {
        company_id: lead.id,
        role: "customer",
      },
    },
  });

  if (linkError || !linkData) {
    return NextResponse.json({ error: linkError?.message ?? "Failed to generate link" }, { status: 500 });
  }

  // Save when the link was generated
  await adminClient
    .from("leads")
    .update({ portal_invite_shared_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ link: linkData.properties.action_link });
}
