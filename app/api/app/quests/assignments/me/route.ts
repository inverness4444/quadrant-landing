import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { getAssignmentsForEmployee } from "@/services/questService";
import {
  authRequiredError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const employee =
      (context.user.name
        ? await db.query.employees.findFirst({
            where: and(eq(employees.workspaceId, context.workspace.id), eq(employees.name, context.user.name)),
          })
        : null) ??
      (await db.query.employees.findFirst({ where: eq(employees.workspaceId, context.workspace.id) }));
    if (!employee) {
      return respondWithApiError(notFoundError("Для пользователя не найден профиль сотрудника"));
    }
    const assignments = await getAssignmentsForEmployee(employee.id, context.workspace.id);
    return NextResponse.json({ ok: true, assignments, employeeId: employee.id });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:assignments:me" }));
  }
}
