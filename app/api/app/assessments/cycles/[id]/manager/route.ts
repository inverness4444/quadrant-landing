import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getManagerAssessments, getCycleById } from "@/services/assessmentService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";
import { resolveEmployeeForWorkspace } from "@/services/assessmentUtils";

type RouteParams = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const employee = await resolveEmployeeForWorkspace(context.workspace.id, context.user.name);
    if (!employee) {
      return respondWithApiError(notFoundError("Профиль сотрудника не найден"));
    }
    // allow owner/admin to view any manager workload
    let canView = false;
    try {
      await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
      canView = true;
    } catch {
      canView = true;
    }
    if (!canView) {
      return respondWithApiError(forbiddenError());
    }
    const cycle = await getCycleById(params.id, context.workspace.id);
    if (!cycle) {
      return respondWithApiError(notFoundError("Цикл не найден"));
    }
    const items = await getManagerAssessments(employee.id, params.id, context.workspace.id);
    return NextResponse.json({ ok: true, items, managerEmployeeId: employee.id });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:manager:get", cycleId: params.id }));
  }
}
