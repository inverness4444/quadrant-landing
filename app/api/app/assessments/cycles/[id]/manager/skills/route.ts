import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { updateManagerAssessment } from "@/services/assessmentService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { resolveEmployeeForWorkspace } from "@/services/assessmentUtils";

type RouteParams = { params: { id: string } };

const schema = z.object({
  employeeId: z.string(),
  skillId: z.string(),
  managerLevel: z.number(),
  managerComment: z.string().optional().nullable(),
  finalizeSkill: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const manager = await resolveEmployeeForWorkspace(context.workspace.id, context.user.name);
    if (!manager) {
      return respondWithApiError(notFoundError("Профиль менеджера не найден"));
    }
    try {
      await requireRole(context.workspace.id, context.user.id, ["owner", "admin", "member"]);
    } catch {
      return respondWithApiError(forbiddenError());
    }
    const updated = await updateManagerAssessment({
      cycleId: params.id,
      ...parsed.data,
    });
    if (!updated) {
      return respondWithApiError(notFoundError("Оценка не найдена"));
    }
    return NextResponse.json({ ok: true, assessment: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:manager:update", cycleId: params.id }));
  }
}
