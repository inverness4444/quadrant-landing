import type { WorkspaceSkillSnapshot } from "@/services/skillMapService";

export type EmployeeSkillVector = {
  employeeId: string;
  skillId: string;
  skillName: string;
  skillLevel: number;
};

export function buildAssignmentIndex(snapshot: WorkspaceSkillSnapshot) {
  const index = new Map<string, EmployeeSkillVector[]>();
  for (const assignment of snapshot.assignments) {
    const list = index.get(assignment.employeeId) ?? [];
    list.push({
      employeeId: assignment.employeeId,
      skillId: assignment.skillId,
      skillName: assignment.skillName,
      skillLevel: assignment.skillLevel,
    });
    index.set(assignment.employeeId, list);
  }
  return index;
}
