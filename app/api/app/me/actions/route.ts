import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getEmployeeActions } from "@/services/employeeActionService";
import { getEmployeeProfileSnapshot, resolveEmployeeIdForUser } from "@/services/employeeProfileService";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const employeeId = await resolveEmployeeIdForUser(context.workspace.id, context.user.name);
    if (!employeeId) {
      return NextResponse.json({ ok: true, actions: [] });
    }
    const profile = await getEmployeeProfileSnapshot({ workspaceId: context.workspace.id, employeeId });
    const actions = await getEmployeeActions({ workspaceId: context.workspace.id, employeeId, profile });
    return NextResponse.json({ ok: true, actions });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "me:actions" }));
  }
}

