import type { EmployeeListFilters } from "@/repositories/employeeRepository";
import { listEmployeesPaginated, listEmployeeSkillsForEmployees } from "@/repositories/employeeRepository";
import {
  listArtifactSkillsByArtifactIds,
  listArtifactsByEmployeePaginated,
} from "@/repositories/artifactRepository";

export async function getEmployeePage(workspaceId: string, filters: EmployeeListFilters) {
  const pageResult = await listEmployeesPaginated(workspaceId, filters);
  const employeeIds = pageResult.employees.map((employee) => employee.id);
  const skills = await listEmployeeSkillsForEmployees(employeeIds);
  return {
    employees: pageResult.employees,
    employeeSkills: skills,
    page: pageResult.page,
    pageSize: pageResult.pageSize,
    total: pageResult.total,
  };
}

export async function getEmployeeArtifactsPage(workspaceId: string, employeeId: string, page: number, pageSize: number) {
  const pagination = await listArtifactsByEmployeePaginated(workspaceId, employeeId, page, pageSize);
  const artifactIds = pagination.artifacts.map((artifact) => artifact.id);
  const artifactSkills = await listArtifactSkillsByArtifactIds(artifactIds);
  return {
    artifacts: pagination.artifacts,
    artifactSkills,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
  };
}
