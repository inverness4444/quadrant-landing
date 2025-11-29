import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getEmployeeProfile } from "@/services/employeeProfileService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const profile = await getEmployeeProfile(context.workspace.id, params.id);
    if (!profile) {
      return respondWithApiError(notFoundError("Сотрудник не найден"));
    }
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "employee:profile", employeeId: params.id }));
  }
}
