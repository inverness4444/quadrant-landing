import TeamClient from "@/components/app/team/TeamClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listEmployeePositions } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import { listTrackLevelsByWorkspace, listTracks } from "@/repositories/trackRepository";
import { getEmployeePage } from "@/services/employeeData";

type TeamPageSearchParams = {
  modal?: string | string[];
};

export default async function TeamPage({ searchParams }: { searchParams?: TeamPageSearchParams }) {
  const { workspace } = await requireWorkspaceContext();
  const [employeePage, skills, tracks, trackLevels, positions] = await Promise.all([
    getEmployeePage(workspace.id, { page: 1, pageSize: 20, level: "all" }),
    listSkills(workspace.id),
    listTracks(workspace.id),
    listTrackLevelsByWorkspace(workspace.id),
    listEmployeePositions(workspace.id),
  ]);
  const modalParam = Array.isArray(searchParams?.modal) ? searchParams?.modal[0] : searchParams?.modal;
  const openCreateModalOnMount = modalParam === "create";

  return (
    <TeamClient
      skills={skills}
      tracks={tracks}
      trackLevels={trackLevels}
      initialEmployees={employeePage.employees}
      initialEmployeeSkills={employeePage.employeeSkills}
      pagination={{ page: employeePage.page, pageSize: employeePage.pageSize, total: employeePage.total }}
      positions={positions}
      openCreateModalOnMount={openCreateModalOnMount}
    />
  );
}
