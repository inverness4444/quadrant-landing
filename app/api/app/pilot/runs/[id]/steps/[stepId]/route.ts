import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { updatePilotRunStepStatus } from "@/services/pilotService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

type RouteParams = { params: { id: string; stepId: string } };

const schema = z.object({
  status: z.enum(["pending", "in_progress", "done", "skipped"]),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const step = await updatePilotRunStepStatus({
      pilotRunId: params.id,
      stepId: params.stepId,
      workspaceId: context.workspace.id,
      status: parsed.data.status,
    });
    if (!step) {
      return respondWithApiError(notFoundError("Шаг не найден"));
    }
    return NextResponse.json({ ok: true, step });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:step", pilotId: params.id, stepId: params.stepId }));
  }
}
