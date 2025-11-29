import { notFound } from "next/navigation";
import EmployeeAnalyticsClient from "@/components/app/analytics/EmployeeAnalyticsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getEmployeeById, listEmployeeSkillsForEmployee } from "@/repositories/employeeRepository";
import { listSkills } from "@/repositories/skillRepository";
import { listTrackLevelsByWorkspace, listTracks } from "@/repositories/trackRepository";

type PageParams = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeAnalyticsPage({ params }: PageParams) {
  const { id } = await params;
  const { workspace } = await requireWorkspaceContext();
  const employee = await getEmployeeById(id);
  if (!employee || employee.workspaceId !== workspace.id) {
    return notFound();
  }

  const [employeeSkills, skills, tracks, trackLevels] = await Promise.all([
    listEmployeeSkillsForEmployee(employee.id),
    listSkills(workspace.id),
    listTracks(workspace.id),
    listTrackLevelsByWorkspace(workspace.id),
  ]);

  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const trackMap = new Map(tracks.map((track) => [track.id, track]));
  const trackLevelMap = new Map(trackLevels.map((level) => [level.id, level]));

  const skillProfile = employeeSkills
    .map((assignment) => {
      const skill = skillMap.get(assignment.skillId);
      if (!skill) return null;
      return {
        id: skill.id,
        name: skill.name,
        level: assignment.level,
      };
    })
    .filter((entry): entry is { id: string; name: string; level: number } => Boolean(entry))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

  const employeeSummary = {
    id: employee.id,
    name: employee.name,
    position: employee.position,
    level: employee.level,
    trackName: employee.primaryTrackId ? trackMap.get(employee.primaryTrackId)?.name ?? null : null,
    trackLevelName: employee.trackLevelId ? trackLevelMap.get(employee.trackLevelId)?.name ?? null : null,
  };

  return <EmployeeAnalyticsClient employee={employeeSummary} skills={skillProfile} />;
}
