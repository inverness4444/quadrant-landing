import TeamClient from "@/components/app/team/TeamClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listEmployeePositions } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import { listTrackLevelsByWorkspace, listTracks } from "@/repositories/trackRepository";
import { getEmployeePage } from "@/services/employeeData";

export default async function TeamPage() {
  const { workspace } = await requireWorkspaceContext();
  const [employeePage, skills, tracks, trackLevels, positions] = await Promise.all([
    getEmployeePage(workspace.id, { page: 1, pageSize: 20, level: "all" }),
    listSkills(workspace.id),
    listTracks(workspace.id),
    listTrackLevelsByWorkspace(workspace.id),
    listEmployeePositions(workspace.id),
  ]);

  return (
    <TeamClient
      skills={skills}
      tracks={tracks}
      trackLevels={trackLevels}
      initialEmployees={employeePage.employees}
      initialEmployeeSkills={employeePage.employeeSkills}
      pagination={{ page: employeePage.page, pageSize: employeePage.pageSize, total: employeePage.total }}
      positions={positions}
    />
  );
}
