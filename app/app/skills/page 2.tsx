import SkillsClient from "@/components/app/skills/SkillsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getSkillPage } from "@/services/skillData";

type SkillsPageSearchParams = {
  modal?: string | string[];
};

export default async function SkillsPage({ searchParams }: { searchParams?: SkillsPageSearchParams }) {
  const { workspace } = await requireWorkspaceContext();
  const skillPage = await getSkillPage(workspace.id, { page: 1, pageSize: 20, type: "all" });
  const modalParam = Array.isArray(searchParams?.modal) ? searchParams?.modal[0] : searchParams?.modal;
  const openCreateModalOnMount = modalParam === "create";

  return (
    <SkillsClient
      initialSkills={skillPage.skills}
      initialEmployeeSkills={skillPage.employeeSkills}
      initialEmployees={skillPage.employees}
      pagination={{ page: skillPage.page, pageSize: skillPage.pageSize, total: skillPage.total }}
      openCreateModalOnMount={openCreateModalOnMount}
    />
  );
}
