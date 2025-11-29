import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { db } from "@/lib/db";
import { employees, employeeRoleAssignments, roleProfiles } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        primaryRoleName: roleProfiles.name,
      })
      .from(employees)
      .leftJoin(
        employeeRoleAssignments,
        and(
          eq(employeeRoleAssignments.employeeId, employees.id),
          eq(employeeRoleAssignments.workspaceId, context.workspace.id),
          eq(employeeRoleAssignments.isPrimary, true),
        ),
      )
      .leftJoin(roleProfiles, eq(roleProfiles.id, employeeRoleAssignments.roleProfileId))
      .where(eq(employees.workspaceId, context.workspace.id));
    return NextResponse.json({ ok: true, employees: rows });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "employees:list" }));
  }
}
