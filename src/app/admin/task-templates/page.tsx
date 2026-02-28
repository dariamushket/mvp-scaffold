import { redirect } from "next/navigation";

export default function TaskTemplatesPage() {
  redirect("/admin/library?tab=task-templates");
}
