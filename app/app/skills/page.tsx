import SkillsRolesPage from "@/components/app/skills/SkillsRolesPage";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function SkillsRolesPageRoute() {
  const { member } = await requireWorkspaceContext();
  return <SkillsRolesPage canEdit={member.role === "owner" || member.role === "admin"} />;
}
