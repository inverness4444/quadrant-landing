import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { updateSelfAssessment } from "@/services/assessmentService";
import {
  authRequiredError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { resolveEmployeeForWorkspace } from "@/services/assessmentUtils";

type RouteParams = { params: { id: string } };

const schema = z.object({
  skillId: z.string(),
  selfLevel: z.number(),
  selfComment: z.string().optional().nullable(),
  submit: z.boolean().optional(),
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
    const employee = await resolveEmployeeForWorkspace(context.workspace.id, context.user.name);
    if (!employee) {
      return respondWithApiError(notFoundError("Профиль сотрудника не найден"));
    }
    const updated = await updateSelfAssessment({
      cycleId: params.id,
      employeeId: employee.id,
      ...parsed.data,
    });
    if (!updated) {
      return respondWithApiError(notFoundError("Оценка не найдена"));
    }
    return NextResponse.json({ ok: true, assessment: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:self:update", cycleId: params.id }));
  }
}
