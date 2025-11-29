import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { addMoveScenarioAction, getMoveScenarioById, updateMoveScenarioStatus } from "@/services/movesService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  notFoundError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

type RouteParams = { params: { id: string } };

const actionSchema = z.object({
  type: z.enum(["hire", "develop", "reassign", "promote", "backfill"]).optional(),
  teamId: z.string().optional().nullable(),
  fromEmployeeId: z.string().optional().nullable(),
  toEmployeeId: z.string().optional().nullable(),
  jobRoleId: z.string().optional().nullable(),
  skillId: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const patchSchema = z.object({
  status: z.enum(["draft", "review", "approved", "archived"]).optional(),
  action: actionSchema.optional(),
});

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
    const scenario = await getMoveScenarioById(params.id, context.workspace.id);
    if (!scenario) {
      return respondWithApiError(notFoundError("Сценарий не найден"));
    }
    return NextResponse.json({ ok: true, scenario });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:scenarios:get", scenarioId: params.id }));
  }
}

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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    let scenario = null;
    if (parsed.data.status) {
      scenario = await updateMoveScenarioStatus({
        scenarioId: params.id,
        workspaceId: context.workspace.id,
        status: parsed.data.status,
      });
    } else if (parsed.data.action) {
      scenario = await addMoveScenarioAction({
        scenarioId: params.id,
        workspaceId: context.workspace.id,
        action: parsed.data.action,
      });
    }
    if (!scenario) {
      return respondWithApiError(notFoundError("Сценарий не найден"));
    }
    return NextResponse.json({ ok: true, scenario });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "moves:scenarios:update", scenarioId: params.id }));
  }
}
