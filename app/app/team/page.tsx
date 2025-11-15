import TeamClient from "@/components/app/team/TeamClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listEmployees, listEmployeeSkillsByWorkspace } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import { listTrackLevelsByWorkspace, listTracks } from "@/repositories/trackRepository";

export default async function TeamPage() {
  const { workspace } = await requireWorkspaceContext();
  const [employees, skills, employeeSkills, tracks, trackLevels] = await Promise.all([
    listEmployees(workspace.id),
    listSkills(workspace.id),
    listEmployeeSkillsByWorkspace(workspace.id),
    listTracks(workspace.id),
    listTrackLevelsByWorkspace(workspace.id),
  ]);

  return (
    <TeamClient
      employees={employees}
      skills={skills}
      employeeSkills={employeeSkills}
      tracks={tracks}
      trackLevels={trackLevels}
    />
  );
}
