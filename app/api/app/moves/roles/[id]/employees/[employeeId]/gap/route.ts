import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { computeEmployeeRoleGap, getJobRoleById } from "@/services/movesService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteParams = { params: { id: string; employeeId: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const role = await getJobRoleById(params.id, context.workspace.id);
    if (!role) {
      return respondWithApiError(notFoundError("Роль не найдена"));
    }
    const gap = await computeEmployeeRoleGap({
      employeeId: params.employeeId,
      jobRoleId: params.id,
    });
    return NextResponse.json({ ok: true, gap });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:role-gap", roleId: params.id }));
  }
}
