import { redirect } from "next/navigation";
import SkillsMapClient from "@/components/app/skills/SkillsMapClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function SkillsMapPage() {
  const context = await requireWorkspaceContext();
  if (!context) {
    redirect("/auth/login");
  }
  // allow all roles to view
  return <SkillsMapClient />;
}
