import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireRole";
import { createClient } from "@/lib/supabase/server";

// GET /api/portal/products — authenticated customer
// RLS policy "Customers read own" filters by company_id = lead_id
export async function GET() {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!auth.profile.company_id) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_products")
    .select("*, product_template:product_templates(*, tag:task_tags(*))")
    .eq("lead_id", auth.profile.company_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
