import type { SkillListFilters } from "@/repositories/skillRepository";
import { listSkillsPaginated } from "@/repositories/skillRepository";
import { listEmployeeSkillsBySkillIds, listEmployeesByIds } from "@/repositories/employeeRepository";
import {
  listArtifactSkillsByArtifactIds,
  listArtifactsBySkillPaginated,
} from "@/repositories/artifactRepository";

export async function getSkillPage(workspaceId: string, filters: SkillListFilters) {
  const pageResult = await listSkillsPaginated(workspaceId, filters);
  const skillIds = pageResult.skills.map((skill) => skill.id);
  const skillAssignments = await listEmployeeSkillsBySkillIds(skillIds);
  const employeeIds = Array.from(new Set(skillAssignments.map((assignment) => assignment.employeeId)));
  const employees = await listEmployeesByIds(employeeIds);
  return {
    skills: pageResult.skills,
    employeeSkills: skillAssignments,
    employees,
    page: pageResult.page,
    pageSize: pageResult.pageSize,
    total: pageResult.total,
  };
}

export async function getSkillArtifactsPage(workspaceId: string, skillId: string, page: number, pageSize: number) {
  const pagination = await listArtifactsBySkillPaginated(workspaceId, skillId, page, pageSize);
  const artifactIds = pagination.artifacts.map((artifact) => artifact.id);
  if (artifactIds.length === 0) {
    return {
      artifacts: [],
      artifactSkills: [],
      employees: [],
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
    };
  }
  const [artifactAssignments, employees] = await Promise.all([
    listArtifactSkillsByArtifactIds(artifactIds),
    listEmployeesByIds(Array.from(new Set(pagination.artifacts.map((artifact) => artifact.employeeId)))),
  ]);
  const filteredAssignments = artifactAssignments.filter((assignment) => assignment.skillId === skillId);
  return {
    artifacts: pagination.artifacts,
    artifactSkills: filteredAssignments,
    employees,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
  };
}
