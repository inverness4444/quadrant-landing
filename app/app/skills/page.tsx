import SkillsClient from "@/components/app/skills/SkillsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listSkills } from "@/repositories/skillRepository";
import { listEmployeeSkillsByWorkspace, listEmployees } from "@/repositories/employeeRepository";

export default async function SkillsPage() {
  const { workspace } = await requireWorkspaceContext();
  const [skills, employeeSkills, employees] = await Promise.all([
    listSkills(workspace.id),
    listEmployeeSkillsByWorkspace(workspace.id),
    listEmployees(workspace.id),
  ]);

  return <SkillsClient skills={skills} employeeSkills={employeeSkills} employees={employees} />;
}
