import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { getPilotWithSteps, updatePilotStepStatus } from "@/services/pilotService";

const updateSchema = z.object({
  stepId: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "done"]),
  notes: z.string().max(2000).optional().nullable(),
});

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
  try {
    const summary = await getPilotWithSteps(context.workspace.id);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:steps:get" }));
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const step = await updatePilotStepStatus(
      context.workspace.id,
      parsed.data.stepId,
      parsed.data.status,
      parsed.data.notes,
    );
    return NextResponse.json({ ok: true, step });
  } catch (error) {
    if ((error as Error).message === "STEP_NOT_FOUND") {
      return respondWithApiError(validationError({ stepId: ["Шаг не найден"] }));
    }
    if ((error as Error).message === "ACCESS_DENIED") {
      return respondWithApiError(forbiddenError());
    }
    return respondWithApiError(await internalError(error, { route: "pilot:steps:update" }));
  }
}
