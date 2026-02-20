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
    .select("email, company_id")
    .eq("id", id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Send a magic link invite — the handle_new_user trigger will create
  // a profile with role='customer' and company_id=lead.id when the user
  // clicks the link and their auth account is created.
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    lead.email,
    {
      data: {
        company_id: lead.company_id,
        role: "customer",
      },
    }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
