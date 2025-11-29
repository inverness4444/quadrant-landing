import { notFound } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getEmployeeById } from "@/repositories/employeeRepository";
import EmployeeSkillGapClient from "@/components/app/skills/EmployeeSkillGapClient";

type Params = { params: Promise<{ id: string }> };

export default async function EmployeeSkillGapPage({ params }: Params) {
  const { id } = await params;
  const { workspace } = await requireWorkspaceContext();
  const employee = await getEmployeeById(id);
  if (!employee || employee.workspaceId !== workspace.id) {
    return notFound();
  }
  return <EmployeeSkillGapClient employeeId={employee.id} employeeName={employee.name} />;
}
