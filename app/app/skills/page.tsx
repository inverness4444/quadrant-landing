import SkillsClient from "@/components/app/skills/SkillsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getSkillPage } from "@/services/skillData";

export default async function SkillsPage() {
  const { workspace } = await requireWorkspaceContext();
  const skillPage = await getSkillPage(workspace.id, { page: 1, pageSize: 20, type: "all" });

  return (
    <SkillsClient
      initialSkills={skillPage.skills}
      initialEmployeeSkills={skillPage.employeeSkills}
      initialEmployees={skillPage.employees}
      pagination={{ page: skillPage.page, pageSize: skillPage.pageSize, total: skillPage.total }}
    />
  );
}
