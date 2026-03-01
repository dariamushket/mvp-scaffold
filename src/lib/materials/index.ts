import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Material } from "@/types";

export async function listMaterialsByCompany(companyId: string): Promise<Material[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*, tag:task_tags(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching materials:", error);
    return [];
  }

  const materials = (data ?? []) as Material[];

  // uploaded_by → auth.users FK (not profiles), so query profiles separately
  const uploaderIds = Array.from(new Set(materials.map((m) => m.uploaded_by).filter(Boolean))) as string[];
  if (uploaderIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, role")
      .in("id", uploaderIds);
    const roleMap = Object.fromEntries(
      (profileRows ?? []).map((p: { id: string; role: string }) => [p.id, p.role])
    );
    return materials.map((m) => ({
      ...m,
      uploader: m.uploaded_by ? { role: (roleMap[m.uploaded_by] ?? null) as 'admin' | 'customer' } : null,
    }));
  }

  return materials;
}

export async function listAllMaterials(): Promise<Material[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*, tag:task_tags(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all materials:", error);
    return [];
  }
  return (data ?? []) as Material[];
}

export async function getMaterialById(id: string): Promise<Material | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*, tag:task_tags(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Material;
}

export async function listSharedMaterials(): Promise<Material[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*, tag:task_tags(*)")
    .is("company_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shared materials:", error);
    return [];
  }
  return (data ?? []) as Material[];
}

export async function listMaterialsForPortal(companyId: string): Promise<Material[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*, tag:task_tags(*)")
    .eq("is_published", true)
    .eq("is_placeholder", false)
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching portal materials:", error);
    return [];
  }
  return (data ?? []) as Material[];
}

export async function createMaterialRecord(data: {
  title: string;
  description: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  company_id?: string | null;
  uploaded_by: string;
  type?: string;
  is_published?: boolean;
  tag_id?: string | null;
}): Promise<Material | null> {
  const supabase = await createClient();
  const { data: material, error } = await supabase
    .from("materials")
    .insert(data)
    .select("*, tag:task_tags(*)")
    .single();

  if (error) {
    console.error("Error creating material record:", error);
    return null;
  }
  return material as Material;
}

export async function deleteMaterialRecord(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) {
    console.error("Error deleting material:", error);
    return false;
  }
  return true;
}

export async function togglePublish(id: string, isPublished: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error toggling publish:", error);
    return false;
  }
  return true;
}
