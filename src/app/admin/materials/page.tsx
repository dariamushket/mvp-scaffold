import { redirect } from "next/navigation";

export default function AdminMaterialsPage() {
  redirect("/admin/library?tab=materials");
}
