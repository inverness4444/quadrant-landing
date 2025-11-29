import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember } from "@/services/rbac";
import { getSkillGapForEmployee } from "@/services/skillGapService";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  if (!employeeId) {
    return respondWithApiError(validationError({ employeeId: ["employeeId is required"] }));
  }
  try {
    const gap = await getSkillGapForEmployee({ workspaceId: context.workspace.id, employeeId });
    return NextResponse.json({ ok: true, gap });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skill-gap:employee" }));
  }
}
