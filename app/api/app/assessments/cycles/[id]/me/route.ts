import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { getEmployeeAssessments } from "@/services/assessmentService";
import {
  authRequiredError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteParams = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const employee = await resolveEmployee(context.workspace.id, context.user.name);
    if (!employee) {
      return respondWithApiError(notFoundError("Профиль сотрудника не найден"));
    }
    const payload = await getEmployeeAssessments(params.id, employee.id, context.workspace.id);
    if (!payload) {
      return respondWithApiError(notFoundError("Цикл не найден"));
    }
    return NextResponse.json({ ok: true, ...payload, employeeId: employee.id });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:self:get", cycleId: params.id }));
  }
}

async function resolveEmployee(workspaceId: string, name: string | null) {
  if (name) {
    const found = await db.query.employees.findFirst({
      where: and(eq(employees.workspaceId, workspaceId), eq(employees.name, name)),
    });
    if (found) return found;
  }
  return db.query.employees.findFirst({ where: eq(employees.workspaceId, workspaceId) });
}
