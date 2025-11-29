import EmployeeSkillGapClient from "@/components/app/skills/EmployeeSkillGapClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function EmployeeSkillGapPage({ params }: { params: { id: string } }) {
  await requireWorkspaceContext();
  const [employee] = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .where(eq(employees.id, params.id));

  return (
    <EmployeeSkillGapClient
      employeeId={params.id}
      employeeName={employee?.name ?? "Сотрудник"}
    />
  );
}
