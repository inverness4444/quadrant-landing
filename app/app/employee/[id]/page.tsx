import { notFound } from "next/navigation";
import EmployeeProfileClient from "@/components/app/employee/EmployeeProfileClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getEmployeeAssessments, getWorkspaceCycles } from "@/services/assessmentService";
import { computeEmployeeRoleGap, getWorkspaceJobRoles } from "@/services/movesService";
import { getAssignmentsForEmployee } from "@/services/questService";
import { getEmployeeProfile } from "@/services/employeeProfileService";

type PageParams = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeProfilePage({ params }: PageParams) {
  const { id } = await params;
  const { workspace } = await requireWorkspaceContext();
  const profile = await getEmployeeProfile(workspace.id, id);
  if (!profile) {
    return notFound();
  }
  const assignments = await getAssignmentsForEmployee(id, workspace.id);
  const cycles = await getWorkspaceCycles(workspace.id);
  const activeCycle = cycles.find((cycle) => cycle.status === "active") ?? cycles[0];
  const assessment = activeCycle ? await getEmployeeAssessments(activeCycle.id, id, workspace.id) : null;
  const jobRoles = await getWorkspaceJobRoles(workspace.id);
  const potentialRoles = await Promise.all(
    jobRoles.slice(0, 3).map(async (role) => {
      try {
        const gap = await computeEmployeeRoleGap({ employeeId: id, jobRoleId: role.id });
        return { roleName: role.name, gapScore: gap.aggregatedGapScore };
      } catch {
        return null;
      }
    }),
  ).then((items) => items.filter((item): item is { roleName: string; gapScore: number } => Boolean(item)));
  return (
    <EmployeeProfileClient
      employeeId={id}
      initialProfile={profile}
      assignments={assignments}
      assessmentSnapshot={
        assessment
          ? {
              cycleName: assessment.cycle.name,
              progress: assessment.progress,
              finalizedSkills: assessment.assessments.filter((item) => item.finalLevel !== null).length,
            }
          : null
            }
      potentialRoles={potentialRoles}
    />
  );
}
